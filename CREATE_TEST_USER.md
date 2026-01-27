# 🧪 Create Test User for AIOM-V2

## Quick Start

### Option 1: Use Sign-Up Page (Recommended)
This is the easiest way to create a test user with full authentication.

1. **Open the sign-up page**:
   ```
   http://localhost:3001/sign-up
   ```

2. **Fill in the form**:
   - **Email**: `test@aiom.local`
   - **Password**: `Test123!@#`
   - **Name**: `Test User`

3. **Click "Sign Up"**

4. **Sign in**:
   ```
   http://localhost:3001/sign-in
   ```
   Use the same credentials.

---

### Option 2: Use Database Script
Create a user directly in the database (requires password setup via Better Auth).

```bash
# Run the test user creation script
npx tsx scripts/create-test-user.ts
```

**Note**: This creates the user record but Better Auth requires password setup through the UI.

---

### Option 3: Manual Database Insert
If you prefer to use a database client:

```sql
-- Connect to PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/aiom_v2

-- Insert test user
INSERT INTO "user" (id, email, "emailVerified", name, image, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'test@aiom.local',
  true,
  'Test User',
  NULL,
  NOW(),
  NOW()
);
```

Then set password via sign-up flow.

---

## Test User Credentials

**Email**: `test@aiom.local`  
**Password**: `Test123!@#`  
**Name**: `Test User`

---

## After Creating User

### 1. Sign In
```
http://localhost:3001/sign-in
```

### 2. Test These Pages

#### Dashboard
```
http://localhost:3001/dashboard
```

#### Claude Usage Analytics
```
http://localhost:3001/admin/claude-usage
```

#### Mobile Routes
```
http://localhost:3001/mobile
http://localhost:3001/mobile/expenses
http://localhost:3001/mobile/approvals
```

#### Other Features
```
http://localhost:3001/dashboard/inbox
http://localhost:3001/dashboard/settings
http://localhost:3001/dashboard/reports
```

---

## Troubleshooting

### "Email already exists"
The user already exists. Just sign in:
```
http://localhost:3001/sign-in
```

### "Invalid credentials"
1. Try signing up again with a new email
2. Or reset the database:
   ```bash
   npm run db:down
   npm run db:up
   npm run db:migrate
   ```

### Can't access protected routes
Make sure you're signed in. Check the browser console for auth errors.

---

## Quick Test Checklist

After signing in, verify:

- [ ] Dashboard loads
- [ ] User profile shows in header
- [ ] Navigation works
- [ ] Can access settings
- [ ] Can view reports
- [ ] Claude analytics accessible (if admin)
- [ ] Mobile routes work
- [ ] Theme switcher works
- [ ] No console errors

---

## Production Note

⚠️ **Never use these test credentials in production!**

For production:
- Use strong, unique passwords
- Enable email verification
- Set up proper user roles
- Configure OAuth providers
- Enable 2FA if needed

