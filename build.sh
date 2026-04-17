#!/bin/bash
# Ninaflix Tizen Build Script
# Usage: ./build.sh [install]
# Requires: Tizen CLI installed and configured

set -e

APP_NAME="Ninaflix"
BUILD_DIR=".buildResult"
RELEASE_DIR="./release"
WGT_NAME="Ninaflix.wgt"

echo "[Ninaflix] Building for Tizen TV..."

# Clean previous build
rm -rf "$BUILD_DIR" "$RELEASE_DIR"

# Build web app
tizen build-web -- "$APP_NAME"

# Package as .wgt
mkdir -p "$RELEASE_DIR"
tizen package -t wgt -o "$RELEASE_DIR" -- "$BUILD_DIR"

echo "[Ninaflix] Package: $RELEASE_DIR/$WGT_NAME"
echo "[Ninaflix] Size: $(du -h "$RELEASE_DIR/$WGT_NAME" | cut -f1)"

# Install if requested
if [ "$1" = "install" ]; then
    echo "[Ninaflix] Installing to TV..."
    tizen install -n "$RELEASE_DIR/$WGT_NAME"
    echo "[Ninaflix] Installed. Launch from TV app menu."
fi
