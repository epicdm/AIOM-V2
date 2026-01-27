#!/bin/bash
# Authenticated Session Template
#
# Usage: ./authenticated-session.sh https://app.example.com/login

set -e

URL="${1:-https://app.example.com/login}"
STATE_FILE="auth-state.json"

echo "🔐 Login to $URL..."

if [ -f "$STATE_FILE" ]; then
    echo "📂 Found saved auth state, loading..."
    agent-browser state load "$STATE_FILE"
    agent-browser open "$URL"
else
    echo "🆕 No saved state, performing login..."
    agent-browser open "$URL"
    agent-browser snapshot -i

    echo ""
    echo "Please provide login credentials:"
    read -p "Username ref (e.g., @e1): " username_ref
    read -p "Username value: " username
    read -p "Password ref (e.g., @e2): " password_ref
    read -sp "Password value: " password
    echo ""
    read -p "Submit button ref (e.g., @e3): " submit_ref

    agent-browser fill "$username_ref" "$username"
    agent-browser fill "$password_ref" "$password"
    agent-browser click "$submit_ref"

    echo "⏳ Waiting for login to complete..."
    agent-browser wait --load networkidle

    echo "💾 Saving authentication state..."
    agent-browser state save "$STATE_FILE"
    echo "✅ Auth state saved to $STATE_FILE"
fi

echo ""
echo "✅ Authenticated session ready!"
agent-browser snapshot -i
