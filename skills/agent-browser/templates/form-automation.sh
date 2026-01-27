#!/bin/bash
# Form Automation Template
#
# Usage: ./form-automation.sh https://example.com/form

set -e

URL="${1:-https://example.com/form}"

echo "🌐 Opening form at $URL..."
agent-browser open "$URL"

echo "📸 Taking snapshot to get element refs..."
agent-browser snapshot -i

echo ""
echo "Example form filling (adjust refs based on snapshot output):"
echo "  agent-browser fill @e1 \"user@example.com\""
echo "  agent-browser fill @e2 \"password123\""
echo "  agent-browser click @e3"
echo ""
echo "Waiting for user to fill form..."
echo "Press any key to continue..."
read -n 1 -s

echo ""
echo "🔄 Waiting for page to load..."
agent-browser wait --load networkidle

echo "📸 Taking final snapshot..."
agent-browser snapshot -i

echo "✅ Form automation complete!"
