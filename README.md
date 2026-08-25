# Etor Backend Setup Guide

Complete backend for Etor Admin (Flutter + Node.js + Supabase).

---

## What's Inside

```
etor-backend/
├── database/schema.sql          ← Run this in Supabase SQL Editor
├── src/
│   ├── config/supabase.js       ← Supabase client
│   ├── controllers/             ← Business logic per resource
│   ├── routes/                  ← API endpoints
│   ├── middleware/              ← Auth + error handling
│   └── utils/seedAdmin.js       ← Creates default admin user
├── .env.example                 ← Copy to .env and fill in
├── package.json
└── server.js                    ← Entry point
```

---

## Setup Steps (Do in Order)

### 1. Supabase Setup

1. Sign in at supabase.com → open your project
2. Open **SQL Editor** → New Query → paste contents of `database/schema.sql` → Run
3. Go to **Storage** → **New bucket** → name: `documents` → make it **Public**
4. Go to **Settings → API** → copy:
   - Project URL
   - `anon` public key
   - `service_role` key (KEEP SECRET)

### 2. Backend Setup

```bash
cd etor-backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=any_long_random_string_at_least_32_characters_long
```

### 3. Create the Admin Login

```bash
npm run seed:admin
```

This creates:
- Email: `admin@etor.com`
- Password: `password`

(Same as your Flutter login screen defaults.)

### 4. Start the Server

```bash
npm run dev
```

Should print: `🚀 Server running on port 5000`

### 5. Test It

```bash
curl http://localhost:5000/api/test
```

Should return: `{"success":true,"message":"API is working 🚀"}`

Test login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etor.com","password":"password"}'
```

Should return a JWT token.

---

## Flutter Side Updates

Replace these files in your Flutter project (provided in the `flutter-updates` folder):

```
lib/
├── main.dart                              ← REPLACE
└── admin/
    ├── core/
    │   └── api_service.dart               ← NEW (create this)
    └── providers/
        ├── auth_provider.dart             ← REPLACE
        ├── users_provider.dart            ← REPLACE
        ├── real_estate_provider.dart      ← REPLACE
        ├── documents_provider.dart        ← REPLACE
        ├── payment_provider.dart          ← REPLACE
        └── cows_provider.dart             ← REPLACE
```

### Update pubspec.yaml dependencies

Make sure you have:
```yaml
dependencies:
  http: ^1.2.0
  shared_preferences: ^2.2.0
  provider: ^6.1.2
  google_fonts: ^6.0.0
  file_picker: ^8.0.0  # if using documents
  uuid: ^4.0.0
```

You can REMOVE these (no longer needed):
```yaml
# supabase_flutter: ^...   ← remove, backend handles Supabase now
```

### Update API Base URL

In `lib/admin/core/api_service.dart`, set `baseUrl` based on platform:
- **Flutter Web**: `http://localhost:5000/api`
- **Android emulator**: `http://10.0.2.2:5000/api`
- **iOS simulator**: `http://localhost:5000/api`
- **Real device**: `http://YOUR_PC_IP:5000/api`

---

## API Endpoints

All endpoints (except `/auth/login` and `/api/test`) require:
```
Authorization: Bearer <token>
```

### Auth
| Method | Path | Body |
|--------|------|------|
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | — |

### Layouts
| Method | Path |
|--------|------|
| GET | `/api/layouts` |
| GET | `/api/layouts/:id` (includes blocks) |
| POST | `/api/layouts` |
| PUT | `/api/layouts/:id` |
| DELETE | `/api/layouts/:id` |

### Blocks
| Method | Path |
|--------|------|
| GET | `/api/blocks?layout_id=xxx` |
| GET | `/api/blocks/:id` (includes plots) |
| POST | `/api/blocks` |
| PUT | `/api/blocks/:id` |
| DELETE | `/api/blocks/:id` |

### Plots
| Method | Path |
|--------|------|
| GET | `/api/plots?layout_id=&block_id=&status=` |
| GET | `/api/plots/:id` |
| POST | `/api/plots` |
| PUT | `/api/plots/:id` |
| PATCH | `/api/plots/:id/status` |
| PATCH | `/api/plots/:id/payment` |
| POST | `/api/plots/assign` |
| DELETE | `/api/plots/:id` |

### Partners (Users)
| Method | Path |
|--------|------|
| GET | `/api/partners` |
| GET | `/api/partners/:id` |
| POST | `/api/partners` |
| PUT | `/api/partners/:id` |
| DELETE | `/api/partners/:id` |

### Documents
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/documents` | |
| POST | `/api/documents` | multipart/form-data with `file` field |
| DELETE | `/api/documents/:id` | also removes file from storage |

### Payments
| Method | Path |
|--------|------|
| GET | `/api/payments?user_id=xxx` |
| POST | `/api/payments` |
| DELETE | `/api/payments/:id` |

### Cows
| Method | Path |
|--------|------|
| GET | `/api/cows` |
| GET | `/api/cows/farm/:farmAdminId?farm_token=xxx` |
| GET | `/api/cows/assignments` |
| POST | `/api/cows/assign` |
| POST | `/api/cows/assign/remove` |

### Dashboard
| Method | Path |
|--------|------|
| GET | `/api/dashboard/stats` |

---

## Testing the Full Flow

1. Backend running on port 5000 ✅
2. Run admin seeder ✅
3. Start Flutter app: `flutter run -d chrome` (for web)
4. Login screen appears with `admin@etor.com` / `password` pre-filled
5. Click **Sign In** → goes to dashboard
6. Try creating a layout, block, plot — all save to Supabase

---

## Troubleshooting

**"Failed to connect" / "ClientException"**
- Backend not running? Run `npm run dev` in backend folder
- Wrong baseUrl? Check `api_service.dart`. Android emulator needs `10.0.2.2`, not `localhost`

**"Invalid email or password"**
- Did you run `npm run seed:admin`?
- Check the admin_users table in Supabase has a row

**"uuid_generate_v4() does not exist"**
- Run `CREATE EXTENSION "uuid-ossp";` first in SQL Editor

**Documents fail to upload**
- Did you create the `documents` bucket in Supabase Storage?
- Is it set to public?

**CORS errors on Flutter web**
- Backend already allows all origins by default (`ALLOWED_ORIGINS=*` in `.env`)

---

## Production Checklist

Before deploying:
1. Change `JWT_SECRET` to a strong random string
2. Change admin password (run seed with new hash)
3. Set `ALLOWED_ORIGINS` to your real domain only
4. Set `NODE_ENV=production` in `.env`
5. Use HTTPS (deploy to Render, Railway, or Fly.io)
6. Remove `usesCleartextTraffic` from AndroidManifest if you added it
