# OBS 4K Native Sidecar

This folder contains the native Apple-platform track for OBS 4K:

- `OBS4KPhone`: iPhone sender app
- `OBS4KStudio`: macOS receiver / control app
- shared local Swift package dependency: `../../packages/OBS4KProtocol`

## Generate the Xcode project

```bash
cd apps/obs4k-apple
xcodegen generate
```

This creates `OBS4KApple.xcodeproj`.

## Open in Xcode

```bash
open OBS4KApple.xcodeproj
```

## Current state

- Shared protocol models are in place.
- iPhone app includes a live `AVCaptureSession` preview and a sender-style UI shell.
- Mac app includes the OBS-style control surface and preview placeholder.
- Bonjour publishing and browsing scaffolds are wired in.
- A lightweight TCP control channel shape is in place for status updates and remote settings.
- Low-latency encoded video transport is still the next major implementation layer.
