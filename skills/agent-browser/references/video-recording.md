# Video Recording

Record browser interactions for debugging or documentation.

## Basic Recording

```bash
# Start recording
agent-browser record start ./demo.webm

# Perform actions (all interactions are recorded)
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser fill @e2 "text"

# Stop recording
agent-browser record stop
```

## Recording Best Practices

1. **Explore first**: Navigate and understand the flow before recording
2. **Start clean**: Recording creates a fresh context but preserves cookies/storage
3. **Smooth demos**: Plan your actions before starting to record

## Restart Recording

```bash
# Stop current recording and start new one
agent-browser record restart ./take2.webm
```

## Use Cases

- **Bug reports**: Record steps to reproduce issues
- **Documentation**: Create video tutorials
- **Testing**: Record test execution for review
