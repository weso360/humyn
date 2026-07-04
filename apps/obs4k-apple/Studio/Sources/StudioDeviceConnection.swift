import Combine
import Foundation
import Network
import OBS4KProtocol

@MainActor
final class StudioDeviceConnection: ObservableObject {
  @Published private(set) var latestStatus: SenderStatusPacket?
  @Published private(set) var phase: ConnectionPhase = .searching

  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()
  private var connection: NWConnection?

  func connect(to device: RemoteDevice) {
    guard let hostName = device.hostName, let port = device.port, let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
      phase = .ready
      return
    }

    let host = NWEndpoint.Host(hostName.trimmingCharacters(in: CharacterSet(charactersIn: ".")))
    let connection = NWConnection(host: host, port: nwPort, using: .tcp)
    connection.stateUpdateHandler = { [weak self] state in
      Task { @MainActor in
        switch state {
        case .ready:
          self?.phase = .streaming
        case .failed, .cancelled:
          self?.phase = .offline
        default:
          self?.phase = .connecting
        }
      }
    }
    connection.start(queue: .global(qos: .userInitiated))
    self.connection = connection
    receive(on: connection)
  }

  func disconnect() {
    connection?.cancel()
    connection = nil
    phase = .offline
  }

  func send(_ packet: HostControlPacket) {
    guard let connection, let data = try? encoder.encode(packet) else { return }
    connection.send(content: data, completion: .contentProcessed { error in
      if let error {
        print("StudioDeviceConnection send error: \(error)")
      }
    })
  }

  private func receive(on connection: NWConnection) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
      guard let self else { return }

      if let data, !data.isEmpty,
         let packet = try? self.decoder.decode(SenderStatusPacket.self, from: data) {
        Task { @MainActor in
          self.latestStatus = packet
          self.phase = packet.phase
        }
      }

      if isComplete || error != nil {
        Task { @MainActor in
          self.phase = .offline
        }
        return
      }

      self.receive(on: connection)
    }
  }
}
