# OBS 4K Native Spec

## Goal

Build a native Apple sidecar product inside this repo that turns an iPhone into a controlled camera source for a Mac-based receiver app.

## Product shape

- `OBS4KPhone`
  - SwiftUI iPhone app
  - camera preview
  - lens switching
  - stream settings
  - local status HUD
- `OBS4KStudio`
  - SwiftUI macOS app
  - device discovery
  - preview canvas
  - remote controls
  - stream stats

## Repo structure

- `apps/obs4k-apple`
- `packages/OBS4KProtocol`
- `docs/obs4k`

## MVP scope

1. Same-Wi-Fi discovery
2. Connect one iPhone to one Mac
3. Stable preview at `720p30` and `1080p30`
4. Lens switching
5. Mic mute
6. Aspect ratio and mirror controls
7. Stats strip for fps, bitrate, and transport

## Current implementation snapshot

- Native project scaffold exists and generates through `xcodegen`
- iPhone side has:
  - `AVCaptureSession`
  - lens switching shell
  - stream settings state
  - Bonjour publishing
  - TCP control listener scaffold
- Mac side has:
  - OBS-style receiver UI shell
  - Bonjour browsing and service resolution
  - TCP control client scaffold
  - remote settings propagation
- Remaining heavy lift:
  - encoded video transport
  - preview rendering from received frames
  - audio transport

## Later phases

1. `4K30`
2. `60 fps`
3. HEVC / H.264 negotiation
4. Recording on Mac
5. Profiles and presets
6. Virtual camera output
7. Wired mode research

## Tooling note

This repo can generate the native project structure today using `xcodegen`, but full iOS/macOS target compilation requires full Xcode to be installed and selected for `xcodebuild`.
