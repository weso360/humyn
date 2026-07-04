import Foundation
import OBS4KProtocol

final class PhoneBroadcaster: NSObject, NetServiceDelegate {
  private var service: NetService?

  func publish(deviceName: String, port: Int = 40484) {
    let nextService = NetService(
      domain: OBS4KBonjour.serviceDomain,
      type: OBS4KBonjour.serviceType,
      name: deviceName,
      port: Int32(port)
    )
    nextService.includesPeerToPeer = true
    nextService.delegate = self
    nextService.setTXTRecord(NetService.data(fromTXTRecord: [
      "app": Data(OBS4KBonjour.appName.utf8),
      "device": Data(deviceName.utf8),
    ]))
    nextService.publish()
    service = nextService
  }

  func stop() {
    service?.stop()
    service = nil
  }
}
