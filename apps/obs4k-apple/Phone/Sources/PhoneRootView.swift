import OBS4KProtocol
import SwiftUI

struct PhoneRootView: View {
  @ObservedObject var viewModel: PhoneViewModel

  var body: some View {
    ZStack {
      CameraPreviewView(session: viewModel.session)
        .ignoresSafeArea()

      if let lastError = viewModel.lastError {
        VStack(spacing: 12) {
          Image(systemName: "exclamationmark.triangle.fill")
            .font(.system(size: 36))
          Text(lastError)
            .multilineTextAlignment(.center)
            .font(.headline)
        }
        .padding(24)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
      }

      if !viewModel.isChromeHidden {
        VStack {
          HStack {
            StatusCapsule(content: "\(viewModel.stats.framesPerSecond) fps • \(viewModel.stats.payloadLabel)")
            Spacer()
            Button {
              viewModel.toggleChrome()
            } label: {
              Image(systemName: "eye")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 74, height: 74)
                .background(.black.opacity(0.22), in: Circle())
            }
          }
          .padding(.horizontal, 36)
          .padding(.top, 82)

          Spacer()

          VStack(spacing: 16) {
            HStack(spacing: 16) {
              ForEach(CameraLens.allCases) { lens in
                Button {
                  viewModel.selectLens(lens)
                } label: {
                  Text(lens.label)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(viewModel.settings.lens == lens ? .black : .white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                      Group {
                        if viewModel.settings.lens == lens {
                          Color.white
                        } else {
                          Color.clear
                        }
                      },
                      in: RoundedRectangle(cornerRadius: 26, style: .continuous)
                    )
                }
                .buttonStyle(.plain)
              }

              Button {
                viewModel.toggleChrome()
              } label: {
                Image(systemName: "ellipsis")
                  .font(.system(size: 28, weight: .bold))
                  .foregroundStyle(.white)
                  .frame(width: 82, height: 82)
                  .background(.black.opacity(0.24), in: Circle())
              }
            }
            .padding(22)
            .background(.black.opacity(0.32), in: RoundedRectangle(cornerRadius: 42, style: .continuous))

            Text("\(viewModel.settings.resolution.label) • \(viewModel.settings.frameRate.label) • \(viewModel.settings.codec.label)")
              .font(.system(size: 18, weight: .medium, design: .rounded))
              .foregroundStyle(.white.opacity(0.7))

            VStack(spacing: 12) {
              HStack {
                Text("Zoom")
                Spacer()
                Text(String(format: "%.1fx", viewModel.settings.zoomFactor))
              }
              .font(.system(size: 16, weight: .semibold, design: .rounded))
              .foregroundStyle(.white.opacity(0.76))

              Slider(
                value: Binding(
                  get: { viewModel.settings.zoomFactor },
                  set: { viewModel.setZoomFactor($0) }
                ),
                in: 1...5
              )
              .tint(.white)
            }
            .padding(.horizontal, 8)
          }
          .padding(.horizontal, 36)
          .padding(.bottom, 42)
        }
      } else {
        VStack {
          Spacer()
          HStack {
            Spacer()
            Button {
              viewModel.toggleChrome()
            } label: {
              Image(systemName: "eye.slash")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 66, height: 66)
                .background(.black.opacity(0.25), in: Circle())
            }
            .padding(32)
          }
        }
      }
    }
    .task {
      viewModel.start()
    }
    .statusBarHidden(true)
  }
}

private struct StatusCapsule: View {
  let content: String

  var body: some View {
    HStack(spacing: 14) {
      Circle()
        .fill(.green)
        .frame(width: 16, height: 16)
      Text(content)
        .font(.system(size: 20, weight: .medium, design: .rounded))
      Spacer(minLength: 0)
    }
    .foregroundStyle(.white)
    .padding(.horizontal, 24)
    .frame(height: 72)
    .frame(maxWidth: 300, alignment: .leading)
    .background(.ultraThinMaterial, in: Capsule())
  }
}
