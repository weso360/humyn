import Foundation
import Network
import OBS4KProtocol

final class PhoneControlServer {
  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()

  private var listener: NWListener?
  private var connections: [NWConnection] = []
  private var statusProvider: (() -> SenderStatusPacket)?
  private var commandHandler: ((HostControlPacket) -> Void)?

  func start(
    port: UInt16 = 40484,
    statusProvider: @escaping () -> SenderStatusPacket,
    commandHandler: @escaping (HostControlPacket) -> Void
  ) {
    self.statusProvider = statusProvider
    self.commandHandler = commandHandler

    do {
      let parameters = NWParameters.tcp
      let listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!)
      listener.newConnectionHandler = { [weak self] connection in
        self?.accept(connection)
      }
      listener.start(queue: .global(qos: .userInitiated))
      self.listener = listener
    } catch {
      print("PhoneControlServer failed to start: \(error)")
    }
  }

  func stop() {
    connections.forEach { $0.cancel() }
    connections.removeAll()
    listener?.cancel()
    listener = nil
  }

  func broadcastStatus() {
    guard let payload = statusProvider() else { return }

    connections.removeAll { connection in
      switch connection.state {
      case .cancelled, .failed(_):
        true
      default:
        false
      }
    }

    for connection in connections {
      send(payload, over: connection)
    }
  }

  private func accept(_ connection: NWConnection) {
    connection.stateUpdateHandler = { [weak self] state in
      guard let self else { return }
      switch state {
      case .cancelled, .failed(_):
        self.connections.removeAll { $0 === connection }
      default:
        break
      }
    }
    connections.append(connection)
    connection.start(queue: .global(qos: .userInitiated))
    receive(on: connection)

    if let payload = statusProvider?() {
      send(payload, over: connection)
    }
  }

  private func receive(on connection: NWConnection) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
      guard let self else { return }

      if let data, !data.isEmpty,
         let packet = try? self.decoder.decode(HostControlPacket.self, from: data) {
        self.commandHandler?(packet)
      }

      if isComplete || error != nil {
        connection.cancel()
        self.connections.removeAll { $0 === connection }
        return
      }

      self.receive(on: connection)
    }
  }

  private func send<T: Encodable>(_ payload: T, over connection: NWConnection) {
    guard let data = try? encoder.encode(payload) else { return }
    connection.send(content: data, completion: .contentProcessed { error in
      if let error {
        print("PhoneControlServer send error: \(error)")
      }
    })
  }
}
