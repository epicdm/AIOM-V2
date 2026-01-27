# Session Management

Sessions allow running multiple isolated browser instances in parallel.

## Usage

```bash
# Start different sessions
agent-browser --session test1 open site-a.com
agent-browser --session test2 open site-b.com

# List all sessions
agent-browser session list
```

## State Persistence

```bash
# Save state (cookies, localStorage, sessionStorage)
agent-browser state save auth.json

# Load saved state
agent-browser state load auth.json
```

## Use Cases

- **Parallel testing**: Test multiple scenarios concurrently
- **Different users**: Maintain separate authenticated sessions
- **Concurrent scraping**: Scrape multiple sites in parallel
