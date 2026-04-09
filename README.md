# Hope International Compensation Backend

Node.js + Express + PostgreSQL backend for binary MLM compensation with modular architecture:
- `controllers`
- `services`
- `repositories`

## Compensation Rules Implemented
1. `PV = 40% of BV` (enforced in code + DB constraints).
2. Direct income = `5%` on personally sponsored users' **qualifying** purchases.
3. Binary tree is strictly `left/right`.
4. Weekly matching:
   - `matched_pv = min(left_pv, right_pv)`
   - `matching_income = matched_pv * 10%`
   - no carry forward for unmatched PV
   - both legs reset to `0` after weekly close
5. Weekly cap:
   - `cap = weekly_self_pv * rank_cap_multiplier`
   - No Rank `3x`, Bronze `4x`, Silver `5x`, Gold `6x`, Diamond `7x`, Crown `8x`
6. Matching payout is capped by weekly cap.
7. Monthly rewards by monthly BV:
   - `2000 => 100`
   - `5000 => 250`
   - `10000 => 500`
   - `50000 => 1000 + iPhone`
   - `100000 => 2000 + four wheeler`
   - `500000 => 5000 + bungalow`
8. Ledger entries for:
   - `direct_income`
   - `matching_income`
   - `reward_qualification`
   - `cap_overflow`
9. Weekly/monthly summary tables included for auditability.
10. Idempotency safeguards for weekly matching and monthly reward cycles.
11. Order settlement gate for MLM:
   - all orders open with a `3-day replacement window`
   - BV/PV propagation, direct income, and MLM qualification effects apply only after settlement
   - replaced/cancelled/returned orders in the window are reversed from MLM settlement
12. Seller-owned approved products stay MLM-eligible if `is_qualifying = true`.
13. Seller commercial split:
   - platform margin = `50%`
   - seller commission = `50%`
   - seller earnings remain `pending` until settlement and then move to `finalized`

## Setup
1. Copy env file:
   - `cp .env.example .env`
2. Configure:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - Production only: persistent media storage is required
   - Railway with attached volume: no manual media env var is required because the app auto-uses `RAILWAY_VOLUME_MOUNT_PATH`
   - Other hosts: set `MEDIA_STORAGE_ROOT` to the absolute path of a mounted persistent volume, for example `MEDIA_STORAGE_ROOT=/var/data/hope-international/media` when a Render persistent disk is mounted at `/var/data`
3. Run:
   - `npm install`
   - `npm run migrate`
   - `npm run seed`
   - `npm run dev`

## Persistent Media Storage
- Admin-uploaded landing and gallery images are stored under the resolved persistent storage root.
- Storage root resolution order is:
  - `MEDIA_STORAGE_ROOT`
  - `RAILWAY_VOLUME_MOUNT_PATH` with app-managed subpath `hope-international/media`
  - local repo storage fallback in non-production only
- `MEDIA_STORAGE_ROOT` must be an absolute path when used.
- In production, the resolved storage root must point outside the deployed app directory to a real persistent mounted volume.
- The app automatically creates these directories under the resolved storage root on startup:
  - `landing`
  - `gallery`
- `uploads`
- Railway setup:
  - Attach a persistent volume to the backend service.
  - No manual `MEDIA_STORAGE_ROOT` env var is required.
  - The app will automatically store media under `<RAILWAY_VOLUME_MOUNT_PATH>/hope-international/media`.
- Recommended Render setup:
  - Attach a persistent disk to the backend service.
  - Set the disk mount path to `/var/data`.
  - Set `MEDIA_STORAGE_ROOT=/var/data/hope-international/media`.
- If production has neither `MEDIA_STORAGE_ROOT` nor `RAILWAY_VOLUME_MOUNT_PATH`, startup fails with a deployment-specific error message instead of silently writing uploads to ephemeral storage.

## Developer Testing & QA
### Dev Seed Accounts
All seeded accounts use password: `Password@123`

- Super Admin: `superadmin@hope.local`
- Admin: `admin@hope.local`
- User A: `alice@hope.local`
- User B: `bob@hope.local`
- Seller Applicant (pending): `seller.applicant@hope.local`
- Approved Seller: `seller.approved@hope.local`

### Included Dev Seed Data
- Admin + super admin users
- Normal users in a binary tree
- Seller applicant + approved seller profiles
- Seller KYC documents
- Admin and seller-owned products (approved/pending/rejected moderation states)
- Orders + order items
- Wallet transactions (`order_purchase`, `direct_income`, `matching_income`, `reward_qualification`, `cap_overflow`, `manual_adjustment`)
- Weekly cycles + weekly user summaries
- Monthly cycles + monthly user summaries
- Monthly reward qualifications
- Seller moderation logs
- Seller earnings ledger + seller payouts + seller activity logs

### Safe Dev Scripts
- `npm run migrate`: runs all migrations
- `npm run seed`: seeds base rank data
- `npm run seed:dev`: seeds full QA/dev dataset
- `npm run reset:dev`: truncates all public tables (dev/test only)
- `npm run reseed:dev`: `reset:dev` + `migrate` + `seed:dev`
- `npm run full-reset:dev`: alias of `reseed:dev`

### Destructive Script Safeguards
`reset:dev`, `reseed:dev`, and `full-reset:dev` are blocked unless:

1. `NODE_ENV` is `development` or `test`
2. `DEV_DB_RESET_CONFIRM=RESET_HOPE_DEV_DB` is set explicitly

Example (PowerShell):

```powershell
$env:NODE_ENV="development"
$env:DEV_DB_RESET_CONFIRM="RESET_HOPE_DEV_DB"
npm run reseed:dev
```

### Suggested End-to-End QA Flow
1. Login as `admin@hope.local`.
2. Verify admin dashboard, user search, ranks, products, orders, wallet, compensation, rewards, and settings pages.
3. Open seller applications and review pending applicant.
4. Login as approved seller and verify `/seller/me`, products, orders, payouts, and documents.
5. Create an order as a normal user.
6. Confirm order starts as `settlement_status=pending` with a replacement window.
7. Run `POST /admin/compensation/settlements/run` after window criteria and verify:
: MLM effects are applied only for settled paid orders.
: seller earnings move from `pending` to `finalized`.
8. Run weekly and monthly compensation endpoints and verify summaries are based on settled orders.

### Key QA Endpoints
- `POST /auth/login`
- `GET /admin/dashboard`
- `GET /admin/users/search?q=alice`
- `GET /admin/ranks`
- `GET /admin/orders`
- `POST /admin/compensation/settlements/run`
- `POST /admin/compensation/weekly/run`
- `POST /admin/compensation/monthly/run`
- `GET /seller/me`
- `GET /seller/orders`
- `GET /seller/payouts`

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Users
- `GET /users/me`
- `GET /users/me/children`
- `GET /users/me/compensation/weekly?cycleStart=YYYY-MM-DD&cycleEnd=YYYY-MM-DD`
- `GET /users/me/compensation/monthly?monthStart=YYYY-MM-DD&monthEnd=YYYY-MM-DD`

### Wallet
- `GET /wallet`
- `POST /wallet/adjust` (admin)

### Matching / Rewards
- `POST /matching/run` (admin)
  - body: `{ cycleStart, cycleEnd, notes? }`
- `GET /matching/runs` (admin)
- `GET /matching/runs/:cycleId/results` (admin)
- `POST /matching/rewards/monthly/run` (admin)
  - body: `{ monthStart, monthEnd, notes? }`

### Products
- `GET /products`
- `POST /products` (admin)
  - body: `{ sku, name, description?, price, bv, isActive?, isQualifying? }`
  - `pv` auto-calculated as `bv * 0.4`

### Orders
- `GET /orders`
- `POST /orders`

### Seller
- `POST /seller/apply` (auth)
  - body:
    - `legalName`, `businessName`, `phone`, `documents[]`
    - optional: `businessType`, `taxId`, `email`, address fields, `kycDetails`
- `GET /seller/me` (auth)
- `POST /seller/products` (approved seller auth)
  - product is created with `moderation_status = pending` and `is_active = false`
- `GET /seller/products/:id` (approved seller auth)
  - seller ownership enforced
- `PATCH /seller/products/:id` (approved seller auth)
  - update resubmits product for moderation (`pending`, not live until approved)
- `GET /seller/orders?page=&limit=&status=&dateFrom=&dateTo=&productId=` (approved seller auth)
  - returns only orders containing seller-owned products
  - includes pagination and aggregate summary (`total_orders`, `total_sales_amount`, `total_bv`, `total_pv`)
- `GET /seller/payouts?page=&limit=&status=&periodStart=&periodEnd=` (approved seller auth)
  - forward-compatible payouts + earnings summary payload
- `POST /seller/documents/upload` (approved seller auth)
  - body: `{ documentType, documentNumber?, documentUrl?, fileName, mimeType, fileSizeBytes, notes? }`
  - allowed MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
- `GET /seller/documents` (approved seller auth)
- `DELETE /seller/documents/:id` (approved seller auth)

### Admin (all require `admin` or `super_admin`)
- `GET /admin/dashboard`
- `GET /admin/users?page=&limit=&search=&rank=&status=&joinedFrom=&joinedTo=`
- `GET /admin/users/search?q=&page=&limit=`
  - optimized for admin lookup (team inspector/autocomplete)
  - searches by `username`, `email`, `seller phone` (if available), and `user id`
- `GET /admin/users/:id`
- `GET /admin/ranks`
  - returns `id`, `name`, `cap_multiplier`, `is_active`, `display_order`
- `PATCH /admin/users/:id/status`
  - body: `{ "isActive": true }`
- `PATCH /admin/users/:id/rank`
  - body: `{ "rankId": 2 }`
- `GET /admin/products?page=&limit=&search=&isActive=&isQualifying=`
- `GET /admin/products/:id`
- `POST /admin/products`
  - body: `{ "sku", "name", "description?", "price", "bv", "isActive?", "isQualifying?" }`
  - `pv` is always derived as `bv * 0.4`.
- `PATCH /admin/products/:id`
  - body: same as create (partial allowed) + optional `moderationStatus` (`pending|approved|rejected`) and `moderationNotes`
- `GET /admin/orders?page=&limit=&search=&status=&userId=&productId=&dateFrom=&dateTo=`
- `GET /admin/orders/:id`
- `GET /admin/wallet/transactions?page=&limit=&search=&source=&type=&userId=&dateFrom=&dateTo=`
- `GET /admin/wallet/summary`
- `POST /admin/wallet/adjust`
  - body: `{ "userId", "amount", "type": "credit|debit", "reason" }`
- `GET /admin/compensation/weekly?page=&limit=`
- `GET /admin/compensation/weekly/:cycleId`
- `POST /admin/compensation/weekly/run`
  - body: `{ "cycleStart", "cycleEnd", "notes?" }`
- `POST /admin/compensation/settlements/run`
  - body: `{ "asOf"?: ISO datetime, "limit"?: number <= 500, "notes"?: string }`
  - processes pending orders whose replacement windows have ended
  - settles MLM effects for paid orders and reverses cancelled/replaced/returned pending orders
- `GET /admin/compensation/monthly?page=&limit=`
- `GET /admin/compensation/monthly/:cycleId`
- `POST /admin/compensation/monthly/run`
  - body: `{ "monthStart", "monthEnd", "notes?" }`
- `GET /admin/rewards/qualifications?page=&limit=&month=YYYY-MM&status=&userId=&search=`
- `GET /admin/rewards/summary?month=YYYY-MM`
- `PATCH /admin/rewards/qualifications/:id/status`
  - body: `{ "status": "qualified|pending|processed|rejected" }`
- `GET /admin/team/user/:id/tree?depth=2`
- `GET /admin/team/user/:id/summary`
- `GET /admin/settings`
- `PATCH /admin/settings`
  - body: `{ "compensationSettings"?, "rankMultipliers"?, "rewardSlabs"? }`
- `GET /admin/seller-applications?page=&limit=&search=&status=`
- `PATCH /admin/seller-applications/:id`
  - body: `{ "status": "approved|rejected", "rejectionReason?", "notes?" }`

## Admin Response Shape
Admin endpoints use a common envelope:

```json
{
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 130,
    "totalPages": 7
  },
  "summary": null,
  "message": "OK"
}
```

- `pagination` is returned for paginated endpoints.
- `summary` is available for endpoints that return extra aggregate blocks.

## Data / Audit Tables
- `weekly_cycles`
- `weekly_user_summaries`
- `monthly_cycles`
- `monthly_user_summaries`
- `monthly_reward_qualifications`
- `wallet_transactions` (income + overflow audit trail)
- `admin_audit_logs`
- `app_settings`
- `seller_profiles`
- `seller_documents`
- `seller_product_moderation_logs`
- `seller_earnings_ledger`
- `seller_payouts`
- `seller_activity_logs`

## Notes
- Matching and monthly rewards are **one execution per cycle** via unique cycle constraints.
- Reward non-cash labels are stored in qualification and monthly summary records.
- Admin mutations are audited with actor, target, and before/after JSON where applicable.
- Roles now support `user`, `seller`, `admin`, `super_admin`.
- Seller products are moderated before going live.
- Product category is now first-class (`products.category`) and is included in seller/admin/product APIs.
- Orders now include settlement fields (`replacement_window_ends_at`, `settlement_status`, `settled_at`).
- Weekly/monthly compensation aggregations use **settled orders only**.
