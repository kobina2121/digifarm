# Deploying the test site

The first deployment is a **test site** (`APP_ENV=staging`): a real web address
for staff and testers on their own phones, with Paystack in **test mode**, so no
real money moves. Live payments wait for D11, D12 and D14 (ROADMAP §7).

## Already done

- The code sends real email (Resend), stores files in a private Vercel Blob
  store (Cloudflare R2 stays available: `STORAGE_DRIVER=s3`), runs on Vercel in
  Frankfurt (`fra1`, beside the Neon database) and has the two scheduled jobs in
  `vercel.json`. Phones shrink photos before uploading them, because Vercel
  accepts at most 4.5 MB per request.
- One real database (2026-11-06): Neon project `digifarm` (Frankfurt), branch
  `production`, used by both the live site and the founder's Mac. Every
  migration is applied, the reference data is seeded (regions, units,
  categories, 32 products) and the founder's admin account exists
  (`LIVE_ADMIN_*` in the local `.env`). There are no test accounts and no test
  database: integration tests skip locally (CI runs them on its own Postgres),
  and the Playwright suites that create accounts must not be run against it.
- Payments are off (`PAYMENT_PROVIDER=none`) until Paystack is set up: checkout
  shows "Ordering opens soon".
- `.env.vercel` (git-ignored, on the founder's Mac) holds every setting Vercel
  needs, with the database and new secrets filled in.

## Accounts to create

1. **Vercel** (vercel.com): sign up with GitHub, _Add New → Project_, import the
   `digifarm` repository. Don't deploy yet.
2. **Vercel Blob**: in the project, _Storage → Create → Blob_. Choose **Private**
   access and the **Frankfurt (fra1)** region, then connect it to the project. Vercel
   adds `BLOB_STORE_ID` to the project by itself.
3. **Resend** (resend.com) → _API Keys_ → create one with sending access.
4. **Paystack** (paystack.com) → _Settings → API Keys & Webhooks_ → copy the
   **test** secret key (`sk_test_…`).

## Settings in Vercel

1. Open `.env.vercel`, fill in `RESEND_API_KEY` and `PAYSTACK_SECRET_KEY`.
2. Vercel → the project → _Settings → Environment Variables_ → paste the whole
   file. Choose _Production_ only.
3. Deploy. Vercel shows the address (e.g. `https://digifarm-xxxx.vercel.app`).
4. Nothing to do for the address: on the production deployment the app uses
   Vercel's own main domain (`VERCEL_PROJECT_PRODUCTION_URL`), so `APP_URL` and
   `BETTER_AUTH_URL` are ignored there and renaming the domain just works. Only
   Google Console needs the new address.
5. Delete `.env.vercel` from the Mac.

## After the first deploy

- **Paystack** → _Settings → API Keys & Webhooks_ → Test Webhook URL:
  `<APP_URL>/api/webhooks/paystack`.
- **Google sign-in** → Google Cloud Console → _Credentials_ → the OAuth client:
  add `<APP_URL>` to _Authorised JavaScript origins_ and
  `<APP_URL>/api/auth/callback/google` to _Authorised redirect URIs_.
- **Email from your own domain**: until a domain is verified in Resend,
  `onboarding@resend.dev` only delivers to the Resend account's own address, so
  other testers never get their sign-up confirmation and can't sign in. Add a
  domain in Resend (DNS records at your registrar), then set
  `EMAIL_FROM="Akuafo <no-reply@yourdomain>"`.
- Sign in with your admin account and change its password (_Forgot password_).

## Known limits of the test site

- Vercel's free plan runs scheduled jobs once a day, so a sold-out product held
  by an unpaid order can stay sold out until the next run (checkout still
  releases holds on the products being bought). A paid plan allows
  `expire-orders` every few minutes.
- New migrations aren't applied by the deployment: run `prisma migrate deploy`
  against the main branch before deploying code that needs them.
- Vercel Blob on the free plan includes 1 GB of storage, 10 GB of downloads,
  10,000 reads and 2,000 uploads a month. **Going over switches Blob off for 30
  days** (no photos load). Every product photo shown is a read, so before real
  buyers arrive, move to Vercel Pro or to R2 (`STORAGE_DRIVER=s3`).
- Not yet in place: error alerts (Sentry), tested backup restore, a security
  review, and a friendly error page.
