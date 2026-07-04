import Foundation

public enum ConnectionTransport: String, Codable, CaseIterable, Sendable {
  case wifi
  case usb

  public var label: String {
    switch self {
    case .wifi: "Wi-Fi"
    case .usb: "USB"
    }
  }
}

public enum ConnectionPhase: String, Codable, CaseIterable, Sendable {
  case searching
  case discovered
  case ready
  case connecting
  case streaming
  case offline
  case error

  public var label: String {
    switch self {
    case .searching: "Searching"
    case .discovered: "Discovered"
    case .ready: "Ready"
    case .connecting: "Connecting"
    case .streaming: "Streaming"
    case .offline: "Offline"
    case .error: "Error"
    }
  }
}

public enum CameraLens: String, Codable, CaseIterable, Identifiable, Sendable {
  case ultraWide
  case wide
  case telephoto
  case front

  public var id: String { rawValue }

  public var label: String {
    switch self {
    case .ultraWide: "Ultra Wide"
    case .wide: "Wide"
    case .telephoto: "Telephoto"
    case .front: "Front"
    }
  }
}

public enum StreamResolution: String, Codable, CaseIterable, Identifiable, Sendable {
  case p720
  case p1080
  case p4K

  public var id: String { rawValue }

  public var width: Int {
    switch self {
    case .p720: 1280
    case .p1080: 1920
    case .p4K: 3840
    }
  }

  public var height: Int {
    switch self {
    case .p720: 720
    case .p1080: 1080
    case .p4K: 2160
    }
  }

  public var label: String {
    switch self {
    case .p720: "720p"
    case .p1080: "1080p"
    case .p4K: "4K"
    }
  }
}

public enum FrameRate: Int, Codable, CaseIterable, Identifiable, Sendable {
  case fps24 = 24
  case fps30 = 30
  case fps60 = 60

  public var id: Int { rawValue }

  public var label: String { "\(rawValue) fps" }
}

public enum AspectRatioPreset: String, Codable, CaseIterable, Identifiable, Sendable {
  case landscape16x9
  case portrait9x16

  public var id: String { rawValue }

  public var label: String {
    switch self {
    case .landscape16x9: "16:9"
    case .portrait9x16: "9:16"
    }
  }
}

public enum MirrorMode: String, Codable, CaseIterable, Identifiable, Sendable {
  case none
  case leftRight
  case topBottom

  public var id: String { rawValue }

  public var label: String {
    switch self {
    case .none: "Off"
    case .leftRight: "Left-Right"
    case .topBottom: "Top-Bottom"
    }
  }
}

public enum StreamCodec: String, Codable, CaseIterable, Identifiable, Sendable {
  case h264
  case hevc

  public var id: String { rawValue }

  public var label: String {
    rawValue.uppercased()
  }
}

public struct RemoteDevice: Identifiable, Codable, Hashable, Sendable {
  public let id: UUID
  public var name: String
  public var transport: ConnectionTransport
  public var phase: ConnectionPhase
  public var hostName: String?
  public var port: Int?

  public init(
    id: UUID = UUID(),
    name: String,
    transport: ConnectionTransport,
    phase: ConnectionPhase,
    hostName: String? = nil,
    port: Int? = nil
  ) {
    self.id = id
    self.name = name
    self.transport = transport
    self.phase = phase
    self.hostName = hostName
    self.port = port
  }

  public var endpointLabel: String {
    if let hostName, let port {
      return "\(hostName):\(port)"
    }

    return transport.label
  }

  public var isReachable: Bool {
    hostName != nil && port != nil
  }
}

public struct StreamSettings: Codable, Hashable, Sendable {
  public var lens: CameraLens
  public var resolution: StreamResolution
  public var frameRate: FrameRate
  public var aspectRatio: AspectRatioPreset
  public var mirrorMode: MirrorMode
  public var codec: StreamCodec
  public var zoomFactor: Double
  public var micMuted: Bool

  public init(
    lens: CameraLens,
    resolution: StreamResolution,
    frameRate: FrameRate,
    aspectRatio: AspectRatioPreset,
    mirrorMode: MirrorMode,
    codec: StreamCodec,
    zoomFactor: Double,
    micMuted: Bool
  ) {
    self.lens = lens
    self.resolution = resolution
    self.frameRate = frameRate
    self.aspectRatio = aspectRatio
    self.mirrorMode = mirrorMode
    self.codec = codec
    self.zoomFactor = zoomFactor
    self.micMuted = micMuted
  }

  public static let `default` = StreamSettings(
    lens: .wide,
    resolution: .p720,
    frameRate: .fps30,
    aspectRatio: .landscape16x9,
    mirrorMode: .none,
    codec: .hevc,
    zoomFactor: 1,
    micMuted: false
  )
}

public struct StreamStats: Codable, Hashable, Sendable {
  public var connectedSeconds: Int
  public var framesPerSecond: Int
  public var bitrateKilobits: Int
  public var bytesSent: Int
  public var transport: ConnectionTransport
  public var resolution: StreamResolution

  public init(
    connectedSeconds: Int,
    framesPerSecond: Int,
    bitrateKilobits: Int,
    bytesSent: Int,
    transport: ConnectionTransport,
    resolution: StreamResolution
  ) {
    self.connectedSeconds = connectedSeconds
    self.framesPerSecond = framesPerSecond
    self.bitrateKilobits = bitrateKilobits
    self.bytesSent = bytesSent
    self.transport = transport
    self.resolution = resolution
  }

  public var sessionLabel: String {
    let minutes = connectedSeconds / 60
    let seconds = connectedSeconds % 60
    return String(format: "%d:%02d", minutes, seconds)
  }

  public var payloadLabel: String {
    if bytesSent >= 1_000_000 {
      return "\(bytesSent / 1_000_000)MB"
    }

    return "\(max(1, bytesSent / 1_000))KB"
  }

  public static let placeholder = StreamStats(
    connectedSeconds: 119,
    framesPerSecond: 30,
    bitrateKilobits: 163,
    bytesSent: 2_000_000,
    transport: .usb,
    resolution: .p720
  )
}

public extension RemoteDevice {
  static let samplePhone = RemoteDevice(
    name: "iPhone",
    transport: .usb,
    phase: .ready
  )
}
