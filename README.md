# Raghad Beauty

Arabic (RTL) beauty and hair-care storefront with WhatsApp ordering and a full admin portal.
Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage).

## Run

    cp .env.example .env.local   # fill in the Supabase URL and anon/publishable key
    npm install
    npm run dev                  # http://localhost:3000

Test on a phone on the same Wi-Fi: `npx next dev -H 0.0.0.0` and open `http://<this machine's IP>:3000`.

- Storefront: `/`
- Admin: `/admin` (Supabase email + password; the user must be listed in `private.admin_users`)

## How it fits together

- `supabase/migrations` - schema, row level security, storage buckets and launch content.
- `lib/store-data.ts` - loads everything the storefront shows, on the server, with the anonymous key.
- `features/storefront/engine.js` - renders the page to HTML on the server and wires cart, checkout,
  WhatsApp handoff, reviews and the 3D hero in the browser. `silk.js` is the WebGL strand.
- `features/admin/engine.js` - schema-driven admin: each screen is a list of collections and forms.
  Saves go straight to Supabase under the admin's session, then `/api/revalidate` refreshes the storefront.
- `lib/i18n` - interface strings per locale. Add a dictionary and a direction to launch another language.

## Rules enforced in the database

- Visitors can only read. Only users in `private.admin_users` can write.
- Coupon codes are never listed publicly; a code is checked through `check_coupon()`.
- Anyone can submit a review, always as `pending`; only approved reviews are readable.
- A product without a price is shown but cannot be ordered.
- Ordering is disabled until a WhatsApp number is set in the admin.

## Database changes

    supabase link --project-ref <ref>
    supabase db push
