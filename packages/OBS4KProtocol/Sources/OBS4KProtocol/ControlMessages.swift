import Foundation

public enum HostCommand: Codable, Sendable {
  case startStream
  case stopStream
  case updateSettings(StreamSettings)
  case toggleMute(Bool)
}

public enum SenderEvent: Codable, Sendable {
  case deviceHello(RemoteDevice)
  case streamState(ConnectionPhase)
  case stats(StreamStats)
}

public struct HostControlPacket: Codable, Sendable {
  public var command: String
  public var settings: StreamSettings?
  public var micMuted: Bool?

  public init(command: String, settings: StreamSettings? = nil, micMuted: Bool? = nil) {
    self.command = command
    self.settings = settings
    self.micMuted = micMuted
  }

  public static func startStream() -> HostControlPacket {
    HostControlPacket(command: "startStream")
  }

  public static func stopStream() -> HostControlPacket {
    HostControlPacket(command: "stopStream")
  }

  public static func updateSettings(_ settings: StreamSettings) -> HostControlPacket {
    HostControlPacket(command: "updateSettings", settings: settings)
  }

  public static func toggleMute(_ micMuted: Bool) -> HostControlPacket {
    HostControlPacket(command: "toggleMute", micMuted: micMuted)
  }
}

public struct SenderStatusPacket: Codable, Sendable {
  public var device: RemoteDevice
  public var phase: ConnectionPhase
  public var settings: StreamSettings
  public var stats: StreamStats

  public init(
    device: RemoteDevice,
    phase: ConnectionPhase,
    settings: StreamSettings,
    stats: StreamStats
  ) {
    self.device = device
    self.phase = phase
    self.settings = settings
    self.stats = stats
  }
}
