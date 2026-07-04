import Combine
import Foundation
import OBS4KProtocol

final class StudioDiscoveryService: NSObject, ObservableObject {
  @Published private(set) var devices: [RemoteDevice] = []

  private let browser = NetServiceBrowser()
  private var knownServices: [String: NetService] = [:]

  override init() {
    super.init()
    browser.delegate = self
  }

  func start() {
    browser.searchForServices(ofType: OBS4KBonjour.serviceType, inDomain: OBS4KBonjour.serviceDomain)
  }

  func stop() {
    browser.stop()
    knownServices.removeAll()
    devices = []
  }
}

extension StudioDiscoveryService: NetServiceBrowserDelegate {
  func netServiceBrowserWillSearch(_ browser: NetServiceBrowser) {
    devices = []
  }

  func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didFind service: NetService,
    moreComing: Bool
  ) {
    service.delegate = self
    service.resolve(withTimeout: 2)
    knownServices[service.name] = service
    refreshDevices()

    if !moreComing {
      objectWillChange.send()
    }
  }

  func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didRemove service: NetService,
    moreComing: Bool
  ) {
    knownServices.removeValue(forKey: service.name)
    refreshDevices()

    if !moreComing {
      objectWillChange.send()
    }
  }

  private func refreshDevices() {
    devices = knownServices.values
      .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
      .map { service in
        RemoteDevice(
          name: service.name,
          transport: .wifi,
          phase: service.hostName == nil ? .discovered : .ready,
          hostName: service.hostName,
          port: service.port > 0 ? Int(service.port) : nil
        )
      }
  }
}

extension StudioDiscoveryService: NetServiceDelegate {
  func netServiceDidResolveAddress(_ sender: NetService) {
    knownServices[sender.name] = sender
    refreshDevices()
  }
}
