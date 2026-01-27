# Proxy Support

Route browser traffic through proxy servers.

## Basic Usage

```bash
# HTTP proxy
agent-browser --proxy http://proxy.com:8080 open example.com

# Authenticated proxy
agent-browser --proxy http://user:pass@proxy.com:8080 open example.com

# SOCKS5 proxy
agent-browser --proxy socks5://proxy.com:1080 open example.com
```

## Environment Variable

```bash
export AGENT_BROWSER_PROXY="http://proxy.com:8080"
agent-browser open example.com
```

## Use Cases

- **Geo-testing**: Test from different locations
- **Privacy**: Route traffic through VPN/proxy
- **Rotating proxies**: Switch proxies for scraping
- **Corporate networks**: Access through corporate proxy

## Proxy with Authentication

```bash
agent-browser --proxy http://username:password@proxy.example.com:8080 open site.com
```
