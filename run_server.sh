#!/bin/bash
# Helper to run the ai-dashboard server on a stable, non-default port (8910)
# Usage: ./run_server.sh [port]
# If you pass a port as the first argument it will use that instead of 8910.

PROJECT_DIR="/Users/adam/playground/ai-dashboard"
PORT="${1:-8910}"
export PORT
# Optional: enable Flask debug by setting FLASK_DEBUG=1 in the environment
FLASK_DEBUG="${FLASK_DEBUG:-false}"
export FLASK_DEBUG

cd "$PROJECT_DIR" || { echo "Failed to cd to $PROJECT_DIR"; exit 1; }

# Use python3 explicitly
echo "Starting ai-dashboard server in $PROJECT_DIR on 0.0.0.0:${PORT} (FLASK_DEBUG=${FLASK_DEBUG})"
exec python3 server.py
