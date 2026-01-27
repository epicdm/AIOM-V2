# Authentication Patterns

## Login Once, Reuse State

```bash
# 1. Login manually
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --url "**/dashboard"

# 2. Save authenticated state
agent-browser state save auth.json

# 3. Later sessions: load state
agent-browser state load auth.json
agent-browser open https://app.example.com/dashboard
```

## OAuth Flows

```bash
# Navigate through OAuth flow
agent-browser open https://app.example.com/login
agent-browser click @e1  # "Login with Google"
agent-browser wait --url "**/accounts.google.com/**"
agent-browser snapshot -i
agent-browser fill @e1 "email@example.com"
agent-browser click @e2  # Next
agent-browser wait @e3   # Password field
agent-browser fill @e3 "password"
agent-browser click @e4  # Sign in
agent-browser wait --url "**/app.example.com/**"
agent-browser state save google-auth.json
```

## 2FA Handling

For 2FA, pause and manually enter code:

```bash
agent-browser open https://app.example.com/login
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser --headed wait @e4  # Show browser, wait for 2FA code entry
agent-browser state save 2fa-auth.json
```
