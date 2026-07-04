import SwiftUI

@main
struct OBS4KStudioApp: App {
  @StateObject private var viewModel = StudioViewModel()

  var body: some Scene {
    WindowGroup {
      StudioRootView(viewModel: viewModel)
        .preferredColorScheme(.dark)
        .frame(minWidth: 1360, minHeight: 860)
    }
    .windowStyle(.hiddenTitleBar)
  }
}
