# PM STEP 25 — Telegram Ingress v1 (Feature-Flagged, Secret-Gated)

**Status**: ✅ COMPLETE
**Date**: 2026-01-27

---

## Summary

Implemented minimal Telegram webhook ingress endpoint with:
- Feature flag gate (disabled by default)
- Secret token authentication
- Message normalization into internal format
- Tenant routing (stub - no tool execution yet)
- Zero side effects (normalize only)

---

## Implementation Details

### File Added

**New Route**: `src/routes/api/telegram/webhook.ts` (234 lines)

**Route Path**: `POST /api/telegram/webhook`

**Route Features**:
- ✅ Feature flag gated (`TELEGRAM_CHANNEL_ENABLED`)
- ✅ Secret authenticated (`X-Telegram-Bot-Api-Secret-Token`)
- ✅ Parses Telegram Update JSON
- ✅ Normalizes messages into internal format
- ✅ Tenant routing with configurable mapping
- ✅ Returns 200 with normalized data or ignored status
- ✅ Health check endpoint (`GET /api/telegram/webhook`)

---

## Environment Variables

### Required Variables

#### `TELEGRAM_CHANNEL_ENABLED`
**Type**: `"true" | "false"`
**Default**: (undefined, treated as disabled)
**Purpose**: Feature flag to enable/disable Telegram channel ingress

**Behavior**:
- If not set or not `"true"` → Return `404 {"error": "Telegram channel disabled"}`
- If `"true"` → Endpoint is active

**Example**:
```env
TELEGRAM_CHANNEL_ENABLED=true
```

---

#### `TELEGRAM_WEBHOOK_SECRET`
**Type**: `string`
**Required**: Yes (when channel enabled)
**Purpose**: Secret token for authenticating Telegram webhook requests

**Behavior**:
- Compared against `X-Telegram-Bot-Api-Secret-Token` request header
- Mismatch or missing → Return `401 {"error": "Unauthorized"}`

**Example**:
```env
TELEGRAM_WEBHOOK_SECRET=your-random-secret-token-here
```

**How to Generate**:
```bash
# Generate random secret (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Optional Variables

#### `TELEGRAM_TENANT_MAP`
**Type**: JSON string (mapping `chatId` → `tenantId`)
**Default**: (undefined)
**Purpose**: Map Telegram chat IDs to internal tenant IDs

**Format**:
```json
{
  "111": "tenant_a",
  "222": "tenant_b",
  "333": "tenant_c"
}
```

**Example**:
```env
TELEGRAM_TENANT_MAP={"111":"tenant_a","222":"tenant_b"}
```

**Behavior**:
- Looks up `message.chat.id` (as string) in the map
- If found → Use mapped `tenantId`
- If not found → Try `TELEGRAM_DEFAULT_TENANT_ID`
- If still not found → Return `200 {"ok": true, "ignored": true, "reason": "unmapped_chat"}`

---

#### `TELEGRAM_DEFAULT_TENANT_ID`
**Type**: `string`
**Default**: (undefined)
**Purpose**: Fallback tenant ID when chat is not in `TELEGRAM_TENANT_MAP`

**Example**:
```env
TELEGRAM_DEFAULT_TENANT_ID=tenant_default
```

**Behavior**:
- Used when chat ID not found in `TELEGRAM_TENANT_MAP`
- If not set and chat unmapped → Return ignored status

---

## Normalized Message Format

### TypeScript Interface

```typescript
interface NormalizedTelegramMessage {
  channel: "telegram";
  telegramUpdateId: number;
  telegramChatId: number;
  telegramUserId: number;
  telegramUsername?: string;
  text: string;
  messageId: number;
  receivedAt: string; // ISO 8601 timestamp
  tenantId?: string;
}
```

### Example Normalized Message

```json
{
  "channel": "telegram",
  "telegramUpdateId": 123456789,
  "telegramChatId": 111,
  "telegramUserId": 222,
  "telegramUsername": "testuser",
  "text": "hello aiom",
  "messageId": 5,
  "receivedAt": "2026-01-27T10:30:45.123Z",
  "tenantId": "tenant_a"
}
```

---

## API Response Examples

### Scenario 1: Feature Flag Disabled

**Request**:
```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: any-value
Content-Type: application/json

{
  "update_id": 123,
  "message": { ... }
}
```

**Response**: `404 Not Found`
```json
{
  "error": "Telegram channel disabled"
}
```

**Condition**: `TELEGRAM_CHANNEL_ENABLED !== "true"`

---

### Scenario 2: Missing or Invalid Secret

**Request**:
```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: wrong-secret
Content-Type: application/json

{
  "update_id": 123,
  "message": { ... }
}
```

**Response**: `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

**Conditions**:
- Header missing
- Header doesn't match `TELEGRAM_WEBHOOK_SECRET`

---

### Scenario 3: Success - Mapped Tenant

**Request**:
```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: correct-secret
Content-Type: application/json

{
  "update_id": 123,
  "message": {
    "message_id": 5,
    "date": 1700000000,
    "chat": {
      "id": 111,
      "type": "private"
    },
    "from": {
      "id": 222,
      "username": "testuser",
      "first_name": "Test"
    },
    "text": "hello aiom"
  }
}
```

**Response**: `200 OK`
```json
{
  "ok": true,
  "normalized": {
    "channel": "telegram",
    "telegramUpdateId": 123,
    "telegramChatId": 111,
    "telegramUserId": 222,
    "telegramUsername": "testuser",
    "text": "hello aiom",
    "messageId": 5,
    "receivedAt": "2026-01-27T10:30:45.123Z",
    "tenantId": "tenant_a"
  },
  "routing": {
    "tenantId": "tenant_a",
    "chatId": 111,
    "userId": 222
  }
}
```

**Conditions**:
- `TELEGRAM_CHANNEL_ENABLED=true`
- Valid secret header
- Valid Telegram update with text message
- Chat ID `111` mapped to `tenant_a` in `TELEGRAM_TENANT_MAP`

---

### Scenario 4: Success - Unmapped Chat (Ignored)

**Request**:
```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: correct-secret
Content-Type: application/json

{
  "update_id": 456,
  "message": {
    "message_id": 10,
    "date": 1700000000,
    "chat": {
      "id": 999,
      "type": "private"
    },
    "from": {
      "id": 888,
      "username": "unknown"
    },
    "text": "hello"
  }
}
```

**Response**: `200 OK`
```json
{
  "ok": true,
  "ignored": true,
  "reason": "unmapped_chat",
  "updateId": 456,
  "chatId": 999
}
```

**Conditions**:
- Valid request
- Chat ID `999` not in `TELEGRAM_TENANT_MAP`
- No `TELEGRAM_DEFAULT_TENANT_ID` configured

---

### Scenario 5: Non-Text Message (Ignored)

**Request**:
```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: correct-secret
Content-Type: application/json

{
  "update_id": 789,
  "message": {
    "message_id": 15,
    "date": 1700000000,
    "chat": { "id": 111, "type": "private" },
    "from": { "id": 222 },
    "photo": [{ "file_id": "..." }]
  }
}
```

**Response**: `200 OK`
```json
{
  "ok": true,
  "ignored": true,
  "reason": "non_text_message",
  "updateId": 789
}
```

**Condition**: Update doesn't contain `message.text`

---

### Scenario 6: Health Check

**Request**:
```bash
GET /api/telegram/webhook
```

**Response**: `200 OK`
```json
{
  "status": "enabled",
  "service": "telegram-webhook",
  "configured": {
    "enabled": true,
    "secret": true,
    "tenantMap": true,
    "defaultTenant": false
  },
  "timestamp": "2026-01-27T10:30:45.123Z"
}
```

---

## Manual Testing (PowerShell)

### Test 1: Feature Flag Disabled (Default)

```powershell
# No env vars set (default state)
$body = @{
  update_id = 123
  message = @{
    message_id = 5
    date = 1700000000
    chat = @{ id = 111; type = "private" }
    from = @{ id = 222; username = "testuser" }
    text = "hello aiom"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/telegram/webhook" `
  -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = "test-secret" } `
  -ContentType "application/json" `
  -Body $body
```

**Expected**: `404 - Telegram channel disabled`

---

### Test 2: Invalid Secret

```powershell
# Set env: TELEGRAM_CHANNEL_ENABLED=true, TELEGRAM_WEBHOOK_SECRET=correct-secret
$body = @{
  update_id = 123
  message = @{
    message_id = 5
    date = 1700000000
    chat = @{ id = 111; type = "private" }
    from = @{ id = 222; username = "testuser" }
    text = "hello aiom"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/telegram/webhook" `
  -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = "wrong-secret" } `
  -ContentType "application/json" `
  -Body $body
```

**Expected**: `401 - Unauthorized`

---

### Test 3: Valid Request - Mapped Tenant

```powershell
# Set env:
# TELEGRAM_CHANNEL_ENABLED=true
# TELEGRAM_WEBHOOK_SECRET=my-secret-token
# TELEGRAM_TENANT_MAP={"111":"tenant_a","222":"tenant_b"}

$body = @{
  update_id = 123
  message = @{
    message_id = 5
    date = 1700000000
    chat = @{ id = 111; type = "private" }
    from = @{ id = 222; username = "testuser" }
    text = "create task: review PR"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/telegram/webhook" `
  -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = "my-secret-token" } `
  -ContentType "application/json" `
  -Body $body
```

**Expected**: `200 - OK` with normalized message and `tenantId: "tenant_a"`

---

### Test 4: Valid Request - Unmapped Chat

```powershell
# Same env as Test 3, but chat ID not in map
$body = @{
  update_id = 456
  message = @{
    message_id = 10
    date = 1700000000
    chat = @{ id = 999; type = "private" }
    from = @{ id = 888; username = "unknown" }
    text = "hello"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/telegram/webhook" `
  -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = "my-secret-token" } `
  -ContentType "application/json" `
  -Body $body
```

**Expected**: `200 - OK` with `ignored: true, reason: "unmapped_chat"`

---

### Test 5: Health Check

```powershell
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:3000/api/telegram/webhook"
```

**Expected**: JSON with status and configuration flags

---

## TypeScript Compilation Results

### Before PM STEP 25
```bash
$ npx tsc --noEmit --pretty false 2>&1 | grep "error TS" | wc -l
94
```

### After PM STEP 25
```bash
$ npx tsc --noEmit --pretty false 2>&1 | grep "error TS" | wc -l
94
```

### Telegram Webhook File
```bash
$ npx tsc --noEmit --pretty false 2>&1 | grep "telegram/webhook"
# No output - 0 errors ✓
```

**Result**: ✅ **No new TypeScript errors introduced**

---

## Test Results

### npm test Output

```bash
$ npm test

> test
> playwright test tests/smoke.spec.ts --config playwright.config.ts --reporter=list

Running 1 test using 1 worker

[Smoke Test] Health Status: degraded
[Smoke Test] Database Status: pass
  ✓  1 [chromium] › tests\smoke.spec.ts:17:3 › Smoke Test - System Health
     › GET /api/monitoring/system-health returns valid health status (64ms)

  1 passed (1.8s)
```

**Status**: ✅ **ALL TESTS PASSING**

---

## Architecture Notes

### Tenant Routing Logic

```typescript
function resolveTenantId(chatId: number): string | null {
  // 1. Try TELEGRAM_TENANT_MAP (explicit mapping)
  const tenantMapJson = process.env.TELEGRAM_TENANT_MAP;
  if (tenantMapJson) {
    const tenantMap = JSON.parse(tenantMapJson);
    const chatIdStr = chatId.toString();
    if (tenantMap[chatIdStr]) {
      return tenantMap[chatIdStr];
    }
  }

  // 2. Fallback to TELEGRAM_DEFAULT_TENANT_ID
  const defaultTenantId = process.env.TELEGRAM_DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    return defaultTenantId;
  }

  // 3. No mapping found
  return null;
}
```

**Flow**:
1. Check explicit mapping (chat-specific tenant)
2. Use default tenant (catch-all)
3. Return null → message ignored with `unmapped_chat` reason

---

### Security Model

**Defense in Depth**:
1. **Feature Flag** - Endpoint disabled by default (404)
2. **Secret Token** - Telegram webhook secret verification (401)
3. **Tenant Isolation** - Messages routed to specific tenants only
4. **Ignore Unknown** - Unmapped chats safely ignored (no errors)

**No Tool Execution Yet**:
- This step only normalizes and routes
- PM STEP 26: Persist messages
- PM STEP 27: Execute tools with policy enforcement

---

## What's NOT in This Step

❌ **No tool execution** - Messages normalized only, no actions taken
❌ **No database persistence** - Messages not stored yet
❌ **No LLM integration** - No Claude API calls
❌ **No response sending** - No replies to Telegram users
❌ **No webhook registration** - Manual webhook setup required

**Coming in PM STEP 26**:
- Define internal "Gateway Message" interface
- Persist inbound messages to DB or event log
- Add message history/deduplication

**Coming in PM STEP 27**:
- Tool registry integration (5 tools: task, expense, reminder, search, status)
- Policy enforcement (rate limiting, permissions)
- LLM-based intent parsing

---

## Definition of Done ✅

- [x] Endpoint exists at `/api/telegram/webhook`
- [x] Disabled by default (404 when `TELEGRAM_CHANNEL_ENABLED !== "true"`)
- [x] Requests without/wrong secret return 401
- [x] Valid requests return 200 with normalized data or `ignored: true`
- [x] Tenant routing works (mapped + unmapped cases)
- [x] npx tsc --noEmit passes (no new errors)
- [x] npm test passes (1/1 tests)
- [x] Health check endpoint works
- [x] Zero side effects (normalize only, no tool execution)

---

## Next Steps (PM STEP 26)

### Gateway Message Interface + Persistence

**Objective**: Define internal message format and persist Telegram messages

**Tasks**:
1. Create `src/lib/gateway/types.ts` with unified message interface
2. Support multiple channels (telegram, web, future: whatsapp, sms)
3. Add DB table: `gateway_messages` (or use existing messaging table)
4. Persist normalized Telegram messages with deduplication
5. Add retrieval functions (get by chat, get by tenant, get by date)

**Still No Tool Execution**: Messages stored but not acted upon yet

---

## Environment Variable Summary

### `.env` Template

```env
# Telegram Channel Configuration
TELEGRAM_CHANNEL_ENABLED=false              # Set to "true" to enable
TELEGRAM_WEBHOOK_SECRET=                    # Random secret token (required when enabled)
TELEGRAM_TENANT_MAP=                        # JSON: {"chatId":"tenantId",...} (optional)
TELEGRAM_DEFAULT_TENANT_ID=                 # Fallback tenant (optional)
```

### Example Production Configuration

```env
# Enable Telegram channel
TELEGRAM_CHANNEL_ENABLED=true

# Webhook secret (set when registering webhook with Telegram)
TELEGRAM_WEBHOOK_SECRET=abc123def456ghi789jkl0mn

# Map specific chats to tenants
TELEGRAM_TENANT_MAP={"12345":"company_a","67890":"company_b"}

# Default tenant for unmapped chats (optional - omit to ignore)
# TELEGRAM_DEFAULT_TENANT_ID=company_default
```

---

## Logging Examples

### Success - Mapped Tenant

```
[TelegramWebhook] Normalized message from chat 111 (tenant: tenant_a): {
  updateId: 123,
  messageId: 5,
  text: "create task: review PR"
}
```

### Ignored - Unmapped Chat

```
[TelegramWebhook] Unmapped chat ID: 999, ignoring message
```

### Ignored - Non-Text Message

```
[TelegramWebhook] Ignoring non-text update: 789
```

### Error - Invalid Secret

```
[TelegramWebhook] Unauthorized request: invalid or missing secret
```

### Error - Disabled

```
[TelegramWebhook] Request blocked: TELEGRAM_CHANNEL_ENABLED not set to true
```

---

**PM STEP 25 Complete**: ✅ Telegram ingress endpoint ready, feature-flagged, secret-gated, normalizing messages, no side effects

**Ready for PM STEP 26**: Gateway message interface + persistence layer
