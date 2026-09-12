#!/usr/bin/env bash
# Build script for Render
set -o errexit

echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt

# If node and npm are available in the build environment, build frontend
if command -v npm &> /dev/null; then
    echo "==> Node.js detected. Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    rm -rf backend/static
    cp -r frontend/dist backend/static
    echo "==> Frontend successfully built and synced to backend/static!"
else
    echo "==> Node.js not detected, using pre-bundled assets in backend/static"
fi

echo "==> Build complete!"
