import AVFoundation
import OBS4KProtocol
import SwiftUI
import UIKit

@MainActor
final class PhoneViewModel: ObservableObject {
  @Published var settings: StreamSettings = .default
  @Published var stats: StreamStats = .placeholder
  @Published var phase: ConnectionPhase = .streaming
  @Published var isChromeHidden = false
  @Published var lastError: String?
  @Published var statusText = "Connected to MacBook Pro"

  let session = AVCaptureSession()

  private let sessionQueue = DispatchQueue(label: "uk.aivora.obs4k.phone.session")
  private let broadcaster = PhoneBroadcaster()
  private let controlServer = PhoneControlServer()
  private var videoInput: AVCaptureDeviceInput?
  private var audioInput: AVCaptureDeviceInput?
  private var statsTask: Task<Void, Never>?

  init() {
    UIDevice.current.isBatteryMonitoringEnabled = true
  }

  func start() {
    ensurePermissionsAndConfigure()
  }

  func toggleChrome() {
    withAnimation(.easeInOut(duration: 0.2)) {
      isChromeHidden.toggle()
    }
  }

  func selectLens(_ lens: CameraLens) {
    settings.lens = lens
    reconfigureVideoInput()
    publishStatusUpdate()
  }

  func selectResolution(_ resolution: StreamResolution) {
    settings.resolution = resolution
    applySessionPreset()
    publishStatusUpdate()
  }

  func selectFrameRate(_ frameRate: FrameRate) {
    settings.frameRate = frameRate
    applyFrameRate()
    publishStatusUpdate()
  }

  func setMuted(_ muted: Bool) {
    settings.micMuted = muted
    publishStatusUpdate()
  }

  func setZoomFactor(_ zoomFactor: Double) {
    settings.zoomFactor = zoomFactor
    publishStatusUpdate()
  }

  private func ensurePermissionsAndConfigure() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureSessionIfNeeded()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard granted else {
          Task { @MainActor in
            self?.lastError = "Camera access was denied."
            self?.phase = .error
          }
          return
        }

        self?.configureSessionIfNeeded()
      }
    default:
      lastError = "Camera access is unavailable. Enable it in Settings."
      phase = .error
    }
  }

  private func configureSessionIfNeeded() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.videoInput == nil else {
        if !self.session.isRunning {
          self.session.startRunning()
        }
        return
      }

      self.session.beginConfiguration()
      self.applySessionPreset()
      self.configureVideoInput()
      self.configureAudioInput()
      self.session.commitConfiguration()
      self.applyFrameRate()
      self.session.startRunning()
      Task { @MainActor in
        self.broadcaster.publish(deviceName: UIDevice.current.name)
        self.controlServer.start(
          statusProvider: { [weak self] in self?.statusPacket() ?? SenderStatusPacket(
            device: .samplePhone,
            phase: .searching,
            settings: .default,
            stats: .placeholder
          ) },
          commandHandler: { [weak self] packet in
            Task { @MainActor in
              self?.handle(packet)
            }
          }
        )
        self.startStatsLoop()
        self.phase = .ready
        self.publishStatusUpdate()
      }
    }
  }

  private func configureVideoInput() {
    guard let device = preferredDevice(for: settings.lens) else {
      Task { @MainActor in
        self.lastError = "No compatible camera was found."
        self.phase = .error
      }
      return
    }

    do {
      let input = try AVCaptureDeviceInput(device: device)
      if let current = videoInput {
        session.removeInput(current)
      }

      if session.canAddInput(input) {
        session.addInput(input)
        videoInput = input
      }
    } catch {
      Task { @MainActor in
        self.lastError = error.localizedDescription
        self.phase = .error
      }
    }
  }

  private func configureAudioInput() {
    guard audioInput == nil else { return }
    guard let device = AVCaptureDevice.default(for: .audio) else { return }

    do {
      let input = try AVCaptureDeviceInput(device: device)
      if session.canAddInput(input) {
        session.addInput(input)
        audioInput = input
      }
    } catch {
      Task { @MainActor in
        self.lastError = error.localizedDescription
      }
    }
  }

  private func reconfigureVideoInput() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.session.beginConfiguration()
      self.configureVideoInput()
      self.session.commitConfiguration()
      self.applyFrameRate()
    }
  }

  private func applySessionPreset() {
    let preset: AVCaptureSession.Preset = switch settings.resolution {
    case .p720: .hd1280x720
    case .p1080: .hd1920x1080
    case .p4K: .hd4K3840x2160
    }

    if session.canSetSessionPreset(preset) {
      session.sessionPreset = preset
    } else {
      session.sessionPreset = .high
    }
  }

  private func applyFrameRate() {
    guard let device = videoInput?.device else { return }

    do {
      try device.lockForConfiguration()
      let duration = CMTime(value: 1, timescale: CMTimeScale(settings.frameRate.rawValue))
      device.activeVideoMinFrameDuration = duration
      device.activeVideoMaxFrameDuration = duration
      device.unlockForConfiguration()
    } catch {
      Task { @MainActor in
        self.lastError = "Unable to set frame rate: \(error.localizedDescription)"
      }
    }
  }

  private func preferredDevice(for lens: CameraLens) -> AVCaptureDevice? {
    let position: AVCaptureDevice.Position = lens == .front ? .front : .back
    let deviceType: AVCaptureDevice.DeviceType = switch lens {
    case .ultraWide: .builtInUltraWideCamera
    case .wide, .front: .builtInWideAngleCamera
    case .telephoto: .builtInTelephotoCamera
    }

    return AVCaptureDevice.default(deviceType, for: .video, position: position)
    ?? AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position)
  }

  private func handle(_ packet: HostControlPacket) {
    switch packet.command {
    case "startStream":
      phase = .streaming
      statusText = "Streaming to Mac"
    case "stopStream":
      phase = .ready
      statusText = "Connected to MacBook Pro"
    case "updateSettings":
      if let settings = packet.settings {
        self.settings = settings
        reconfigureVideoInput()
        applySessionPreset()
        applyFrameRate()
      }
    case "toggleMute":
      if let micMuted = packet.micMuted {
        settings.micMuted = micMuted
      }
    default:
      break
    }

    publishStatusUpdate()
  }

  private func startStatsLoop() {
    statsTask?.cancel()
    statsTask = Task { [weak self] in
      guard let self else { return }

      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(1))
        guard !Task.isCancelled else { return }

        stats.connectedSeconds += 1
        stats.framesPerSecond = settings.frameRate.rawValue
        stats.resolution = settings.resolution
        stats.transport = .wifi
        stats.bytesSent += max(80_000, settings.resolution.width * settings.resolution.height / 24)
        stats.bitrateKilobits = max(160, stats.bitrateKilobits + Int.random(in: -18...22))
        publishStatusUpdate()
      }
    }
  }

  private func statusPacket() -> SenderStatusPacket {
    SenderStatusPacket(
      device: RemoteDevice(
        name: UIDevice.current.name,
        transport: .wifi,
        phase: phase
      ),
      phase: phase,
      settings: settings,
      stats: stats
    )
  }

  private func publishStatusUpdate() {
    controlServer.broadcastStatus()
  }
}
