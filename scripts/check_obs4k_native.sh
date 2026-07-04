#!/bin/zsh
set -euo pipefail

echo "Checking OBS 4K native tooling..."
echo

echo "xcode-select path:"
xcode-select -p || true
echo

echo "xcodegen:"
which xcodegen || true
echo

if [ -d "/Applications/Xcode.app" ]; then
  echo "Full Xcode install: found at /Applications/Xcode.app"
else
  echo "Full Xcode install: not found"
fi
echo

echo "Project spec:"
ls -1 apps/obs4k-apple/project.yml
