import OBS4KProtocol
import SwiftUI

struct StudioRootView: View {
  @ObservedObject var viewModel: StudioViewModel

  var body: some View {
    VStack(spacing: 0) {
      topBar

      HStack(spacing: 0) {
        sidebar
        previewArea
      }
    }
    .background(Color.black)
  }

  private var topBar: some View {
    HStack {
      Text("OBS 4K")
        .font(.system(size: 26, weight: .semibold, design: .rounded))
      Spacer()
      HStack(spacing: 20) {
        statChip(systemName: "timer", text: viewModel.stats.sessionLabel, tint: .orange)
        statChip(systemName: "circle.fill", text: viewModel.stats.transport.label, tint: .green)
        statChip(systemName: "gauge.with.dots.needle.33percent", text: "\(viewModel.stats.framesPerSecond) fps", tint: .secondary)
        statChip(systemName: "bolt.horizontal.fill", text: viewModel.stats.payloadLabel, tint: .secondary)
        statChip(systemName: "antenna.radiowaves.left.and.right", text: "\(viewModel.stats.bitrateKilobits) kbps", tint: .secondary)
        statChip(systemName: "rectangle", text: viewModel.settings.resolution.label, tint: .secondary)
        Menu("Profile") {
          Button("Broadcast") {}
          Button("Studio") {}
        }
      }
    }
    .padding(.horizontal, 28)
    .frame(height: 74)
    .background(Color(nsColor: NSColor(calibratedWhite: 0.2, alpha: 1)))
  }

  private var sidebar: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack {
          Text(viewModel.selectedDevice?.name ?? "Devices")
            .font(.system(size: 22, weight: .semibold, design: .rounded))
          Spacer()
          if let selected = viewModel.selectedDevice {
            Label(selected.transport.label, systemImage: selected.transport == .usb ? "cable.connector" : "wifi")
              .foregroundStyle(.green)
              .font(.system(size: 16, weight: .bold))
          }
        }

        if let selected = viewModel.selectedDevice {
          Text(selected.endpointLabel)
            .foregroundStyle(.secondary)
            .font(.system(size: 13, weight: .medium, design: .monospaced))
        }

        card("Devices") {
          VStack(spacing: 14) {
            if viewModel.devices.isEmpty {
              RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.03))
                .frame(height: 90)
                .overlay(
                  VStack(spacing: 8) {
                    Image(systemName: "dot.radiowaves.left.and.right")
                    Text(viewModel.phase.label)
                      .font(.headline)
                  }
                  .foregroundStyle(.secondary)
                )
            } else {
              ForEach(viewModel.devices) { device in
                Button {
                  viewModel.selectedDevice = device
                  viewModel.connectToSelectedDevice()
                } label: {
                  HStack(spacing: 16) {
                    Image(systemName: "iphone")
                      .font(.system(size: 28))
                      .foregroundStyle(.purple)
                    VStack(alignment: .leading, spacing: 4) {
                      Text(device.name)
                        .font(.system(size: 18, weight: .semibold))
                      Text(device.phase.label)
                        .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                      .foregroundStyle(.secondary)
                  }
                  .padding(18)
                  .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
              }
            }
          }
        }

        card("Microphone") {
          VStack(spacing: 16) {
            meterRow
            Text(viewModel.selectedMicLabel)
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(.horizontal, 14)
              .frame(height: 48)
              .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button {
              viewModel.toggleMute()
            } label: {
              Label(viewModel.settings.micMuted ? "Unmute Mic" : "Mute Mic", systemImage: viewModel.settings.micMuted ? "mic.slash.fill" : "mic.fill")
                .font(.system(size: 18, weight: .semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(Color.purple.gradient, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
          }
        }

        card("Camera") {
          grid(of: CameraLens.allCases, columns: 4) { lens in
            toggleTile(
              title: lens.label,
              selected: viewModel.settings.lens == lens,
              action: { viewModel.selectLens(lens) }
            )
          }
        }

        card("Quality") {
          VStack(alignment: .leading, spacing: 14) {
            Text("Resolution")
              .foregroundStyle(.secondary)
            grid(of: StreamResolution.allCases, columns: 3) { resolution in
              toggleTile(
                title: resolution.label,
                selected: viewModel.settings.resolution == resolution,
                action: { viewModel.selectResolution(resolution) }
              )
            }

            Text("Frame Rate")
              .foregroundStyle(.secondary)
            grid(of: FrameRate.allCases, columns: 3) { frameRate in
              toggleTile(
                title: frameRate.label,
                selected: viewModel.settings.frameRate == frameRate,
                action: { viewModel.selectFrameRate(frameRate) }
              )
            }
          }
        }

        card("Frame") {
          VStack(alignment: .leading, spacing: 14) {
            Text("Aspect Ratio")
              .foregroundStyle(.secondary)
            grid(of: AspectRatioPreset.allCases, columns: 2) { preset in
              toggleTile(
                title: preset.label,
                selected: viewModel.settings.aspectRatio == preset,
                action: { viewModel.selectAspectRatio(preset) }
              )
            }

            Text("Mirror")
              .foregroundStyle(.secondary)
            grid(of: [MirrorMode.leftRight, .topBottom], columns: 2) { preset in
              toggleTile(
                title: preset.label,
                selected: viewModel.settings.mirrorMode == preset,
                action: { viewModel.selectMirror(preset) }
              )
            }
          }
        }

        card("Zoom") {
          VStack(alignment: .leading, spacing: 12) {
            Text(String(format: "%.1fx", viewModel.settings.zoomFactor))
              .font(.system(size: 32, weight: .bold, design: .rounded))
            Slider(
              value: Binding(
                get: { viewModel.settings.zoomFactor },
                set: { viewModel.setZoomFactor($0) }
              ),
              in: 1...25
            )
              .tint(.purple)
            HStack {
              Text("1x")
              Spacer()
              Text("max 25x")
            }
            .foregroundStyle(.secondary)
          }
        }
      }
      .padding(20)
    }
    .frame(width: 414)
    .background(Color(nsColor: NSColor(calibratedWhite: 0.16, alpha: 1)))
  }

  private var previewArea: some View {
    ZStack {
      Rectangle()
        .fill(
          LinearGradient(
            colors: [Color.black, Color(red: 0.05, green: 0.05, blue: 0.08)],
            startPoint: .top,
            endPoint: .bottom
          )
        )

      VStack(spacing: 14) {
        Image(systemName: "video.fill")
          .font(.system(size: 52))
          .foregroundStyle(.secondary)
        Text(viewModel.phase == .streaming ? "Control channel connected. Video transport is next." : "Waiting for video...")
          .font(.system(size: 24, weight: .semibold, design: .rounded))
          .foregroundStyle(.secondary)
        if let selected = viewModel.selectedDevice {
          Text(selected.name)
            .foregroundStyle(.secondary.opacity(0.7))
        }
      }
    }
  }

  private var meterRow: some View {
    HStack(spacing: 6) {
      ForEach(0..<20, id: \.self) { index in
        RoundedRectangle(cornerRadius: 2)
          .fill(index < 8 ? Color.green : Color.white.opacity(0.08))
          .frame(height: 14)
      }
    }
  }

  private func statChip(systemName: String, text: String, tint: Color) -> some View {
    HStack(spacing: 8) {
      Image(systemName: systemName)
      Text(text)
        .fontWeight(.semibold)
    }
    .foregroundStyle(tint)
  }

  private func card<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 16) {
      Text(title)
        .font(.system(size: 18, weight: .semibold))
        .foregroundStyle(.secondary)
      content()
    }
    .padding(16)
    .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
  }

  private func toggleTile(title: String, selected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 18, weight: .semibold, design: .rounded))
        .frame(maxWidth: .infinity)
        .frame(height: 66)
        .background(selected ? Color.purple.gradient : Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    .buttonStyle(.plain)
  }

  private func grid<Data: RandomAccessCollection, Content: View>(
    of data: Data,
    columns: Int,
    @ViewBuilder content: @escaping (Data.Element) -> Content
  ) -> some View where Data.Element: Identifiable {
    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: columns), spacing: 10) {
      ForEach(data) { element in
        content(element)
      }
    }
  }
}
