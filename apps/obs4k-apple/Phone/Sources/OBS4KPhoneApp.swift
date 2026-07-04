import SwiftUI

@main
struct OBS4KPhoneApp: App {
  @StateObject private var viewModel = PhoneViewModel()

  var body: some Scene {
    WindowGroup {
      PhoneRootView(viewModel: viewModel)
        .preferredColorScheme(.dark)
    }
  }
}
