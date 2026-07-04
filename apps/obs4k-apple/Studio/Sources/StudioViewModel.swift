import Combine
import OBS4KProtocol
import SwiftUI

@MainActor
final class StudioViewModel: ObservableObject {
  @Published var devices: [RemoteDevice] = []
  @Published var selectedDevice: RemoteDevice?
  @Published var settings: StreamSettings = .default
  @Published var stats: StreamStats = .placeholder
  @Published var phase: ConnectionPhase = .searching
  @Published var selectedMicLabel = "iPhone • Bottom"

  private let discovery = StudioDiscoveryService()
  private let connection = StudioDeviceConnection()
  private var cancellables: Set<AnyCancellable> = []

  init() {
    discovery.$devices
      .receive(on: DispatchQueue.main)
      .sink { [weak self] devices in
        guard let self else { return }
        self.devices = devices
        if self.selectedDevice == nil {
          self.selectedDevice = devices.first
        }
        self.phase = devices.isEmpty ? .searching : .ready
      }
      .store(in: &cancellables)

    connection.$latestStatus
      .receive(on: DispatchQueue.main)
      .sink { [weak self] packet in
        guard let self, let packet else { return }
        self.selectedDevice = packet.device
        self.settings = packet.settings
        self.stats = packet.stats
        self.phase = packet.phase
      }
      .store(in: &cancellables)

    connection.$phase
      .receive(on: DispatchQueue.main)
      .sink { [weak self] phase in
        self?.phase = phase
      }
      .store(in: &cancellables)

    search()
  }

  func search() {
    phase = .searching
    devices = []
    discovery.stop()
    discovery.start()

    Task {
      try? await Task.sleep(for: .seconds(1))
      guard self.devices.isEmpty else { return }
      let phone = RemoteDevice.samplePhone
      self.devices = [phone]
      self.selectedDevice = phone
      self.phase = .ready
    }
  }

  func connectToSelectedDevice() {
    guard let selectedDevice else { return }
    phase = .connecting
    connection.connect(to: selectedDevice)
    connection.send(.startStream())
  }

  func toggleMute() {
    settings.micMuted.toggle()
    connection.send(.toggleMute(settings.micMuted))
  }

  func selectLens(_ lens: CameraLens) {
    settings.lens = lens
    connection.send(.updateSettings(settings))
  }

  func selectResolution(_ resolution: StreamResolution) {
    settings.resolution = resolution
    stats.resolution = resolution
    connection.send(.updateSettings(settings))
  }

  func selectFrameRate(_ frameRate: FrameRate) {
    settings.frameRate = frameRate
    stats.framesPerSecond = frameRate.rawValue
    connection.send(.updateSettings(settings))
  }

  func selectAspectRatio(_ preset: AspectRatioPreset) {
    settings.aspectRatio = preset
    connection.send(.updateSettings(settings))
  }

  func selectMirror(_ mode: MirrorMode) {
    settings.mirrorMode = mode
    connection.send(.updateSettings(settings))
  }

  func setZoomFactor(_ zoomFactor: Double) {
    settings.zoomFactor = zoomFactor
    connection.send(.updateSettings(settings))
  }
}
