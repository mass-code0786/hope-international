# Hope International Frontend

Premium mobile-first Next.js frontend for binary MLM + e-commerce.

## Stack
- Next.js App Router
- React
- Tailwind CSS
- TanStack Query
- Zustand
- Recharts
- Lucide React
- Framer Motion

## Setup
1. Install deps:
   - `npm install`
2. Configure env:
   - copy `.env.example` to `.env.local`
3. Run dev server:
   - `npm run dev`
4. Production build:
   - `npm run build`
   - `npm run start`

## Environment
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Routes
- `/login`
- `/register`
- `/`
- `/dashboard`
- `/shop`
- `/team`
- `/income`
- `/profile`
- `/orders`

## API Assumptions / Adapters
The service layer normalizes these possible backend response styles:
- Direct object response (`{ ... }`)
- Wrapped response (`{ user: ... }`, `{ products: [...] }`, `{ orders: [...] }`, `{ summary: ... }`)
- Team fallback (`[]` if endpoint unavailable)

## Notes
- Auth token is stored in localStorage and mirrored to `hope_token` cookie for route protection.
- Team tree currently renders root + immediate children from `/users/me/children` with fallback-safe UI for deeper tree APIs.
- Income uses wallet ledger sources: `direct_income`, `matching_income`, `reward_qualification`, `cap_overflow`.
