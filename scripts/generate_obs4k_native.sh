#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/../apps/obs4k-apple"
xcodegen generate

echo
echo "Generated: $(pwd)/OBS4KApple.xcodeproj"

if [ -d "/Applications/Xcode.app" ]; then
  echo "Open it with:"
  echo "open OBS4KApple.xcodeproj"
else
  echo "Full Xcode is not installed at /Applications/Xcode.app yet."
fi
