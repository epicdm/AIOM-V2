# Mobile API Gateway

FastAPI gateway providing mobile-optimized endpoints with payload compression, offline sync support, and reduced data transfer.

## Features

- **Payload Compression**: Automatic Brotli/Gzip/Deflate compression for reduced bandwidth
- **Offline Sync**: Queue operations while offline, sync when connected
- **Reduced Data Transfer**: Minimal payloads with selective field responses
- **Rate Limiting**: Per-client rate limiting to prevent abuse
- **Authentication**: Seamless integration with Better Auth

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From the project root
docker compose up mobile-api-gateway
```

The gateway will be available at `http://localhost:8000`.

### Local Development

```bash
cd mobile-gateway

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Endpoints

All endpoints are prefixed with `/api/v1/mobile/`.

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Full health check |
| `/health/ready` | GET | Readiness probe |
| `/health/live` | GET | Liveness probe |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/me` | GET | Get current user profile |
| `/users/me/minimal` | GET | Get minimal user info |
| `/users/me` | PATCH | Update user profile |
| `/users/{user_id}` | GET | Get user by ID |
| `/users` | GET | List users (paginated) |

### Briefings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/briefings/today` | GET | Get today's briefing |
| `/briefings` | GET | List briefings |
| `/briefings/{id}` | GET | Get specific briefing |
| `/briefings/read` | POST | Mark briefing as read |
| `/briefings/unread/count` | GET | Get unread count |

### Offline Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync/push` | POST | Push offline changes |
| `/sync/pull` | POST | Pull server changes |
| `/sync/status` | GET | Get sync status |
| `/sync/resolve` | POST | Resolve conflicts |

## Compression

The gateway automatically compresses responses based on:

1. Client's `Accept-Encoding` header
2. Response content type (JSON, text, etc.)
3. Response size (minimum 500 bytes by default)

Supported encodings (in order of preference):
- `br` (Brotli) - Best compression, preferred for mobile
- `gzip` - Widely compatible
- `deflate` - Legacy support

## Offline Sync

### Push Changes

Send queued offline operations to the server:

```json
POST /api/v1/mobile/sync/push

{
  "items": [
    {
      "id": "queue-item-uuid",
      "operationType": "CREATE",
      "entityType": "expense_request",
      "payload": { "amount": "100.00", "purpose": "Travel" },
      "priority": "normal",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "clientTimestamp": "2024-01-15T10:00:00Z"
}
```

### Pull Changes

Fetch server changes since last sync:

```json
POST /api/v1/mobile/sync/pull

{
  "lastSyncTimestamp": "2024-01-14T10:00:00Z",
  "entityTypes": ["expense_request", "briefing"],
  "limit": 100
}
```

## Authentication

The gateway integrates with Better Auth from the main application.

Supported authentication methods:
1. **Bearer Token**: `Authorization: Bearer <session-token>`
2. **Cookie**: `better-auth.session_token=<session-token>`
3. **Custom Header**: `X-Session-Token: <session-token>`

## Rate Limiting

Default limits:
- 100 requests per 60 seconds per client
- Rate limit headers included in all responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `MAIN_APP_URL` | URL of the main application | http://localhost:3000 |
| `BETTER_AUTH_SECRET` | Secret key for auth validation | - |
| `COMPRESSION_MIN_SIZE` | Minimum bytes to trigger compression | 500 |
| `COMPRESSION_LEVEL` | Compression level (1-9) | 6 |
| `RATE_LIMIT_REQUESTS` | Max requests per window | 100 |
| `RATE_LIMIT_WINDOW` | Rate limit window in seconds | 60 |

## Architecture

```
mobile-gateway/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── middleware/          # Custom middleware
│   │   ├── compression.py   # Compression middleware
│   │   └── rate_limiter.py  # Rate limiting
│   ├── models/              # Pydantic models
│   │   ├── sync.py          # Offline sync models
│   │   ├── responses.py     # Response models
│   │   └── user.py          # User models
│   ├── routers/             # API routers
│   │   ├── health.py        # Health endpoints
│   │   ├── users.py         # User endpoints
│   │   ├── briefings.py     # Briefing endpoints
│   │   └── sync.py          # Sync endpoints
│   ├── services/            # Business logic
│   │   ├── auth.py          # Authentication
│   │   └── database.py      # Database access
│   └── utils/               # Utilities
├── Dockerfile
├── requirements.txt
└── README.md
```

## License

MIT
