#!/bin/bash
# Content Capture Workflow Template
#
# Usage: ./capture-workflow.sh https://example.com ./output

set -e

URL="${1:-https://example.com}"
OUTPUT_DIR="${2:-./output}"

mkdir -p "$OUTPUT_DIR"

echo "🌐 Opening $URL..."
agent-browser open "$URL"

echo "⏳ Waiting for page to load..."
agent-browser wait --load networkidle

echo "📸 Taking screenshot..."
agent-browser screenshot "$OUTPUT_DIR/page.png"

echo "📸 Taking full page screenshot..."
agent-browser screenshot --full "$OUTPUT_DIR/full-page.png"

echo "📄 Generating PDF..."
agent-browser pdf "$OUTPUT_DIR/page.pdf"

echo "📋 Getting page content..."
agent-browser get title > "$OUTPUT_DIR/title.txt"
agent-browser get url > "$OUTPUT_DIR/url.txt"

echo "🌳 Taking snapshot..."
agent-browser snapshot > "$OUTPUT_DIR/snapshot.txt"
agent-browser snapshot -i > "$OUTPUT_DIR/snapshot-interactive.txt"

echo ""
echo "✅ Capture complete!"
echo "📁 Files saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
