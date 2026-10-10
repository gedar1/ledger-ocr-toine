# Ledger OCR

A Next.js (App Router) PWA for accountants to manage clients and
automatically classify receipt expenses (OCR + AI categorization) with
Dutch BTW rates.

## Environment variables

Copy `.env.example` to `.env` and fill in the values. All variables:

| Variable                | Purpose                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string (points at the `docker-compose` Postgres on port 5449).                     |
| `AUTH_SECRET`           | Auth.js / NextAuth session signing secret. Generate with `openssl rand -hex 32`.                         |
| `OPENAI_API_KEY`        | OpenAI API key, used for GPT-4o Vision receipt OCR extraction.                                           |
| `TYPESAFE_API_KEY`      | TypeSafe AI (Jev) API key, used for expense classification (category/BTW/deductible).                    |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name, used for receipt image uploads.                                                   |
| `CLOUDINARY_API_KEY`    | Cloudinary API key.                                                                                      |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret.                                                                                   |
| `RESEND_API_KEY`        | Email provider API key for invitation emails. When unset, a console `EmailService` stub is used instead. |
| `EMAIL_FROM`            | From-address used for invitation/activation emails.                                                      |
| `APP_URL`               | Base URL of the app, used to build invitation/activation links.                                          |

Never commit real secret values — `.env` is gitignored and `.env.example`
only documents the variable names.

## Setup

```bash
# 1. Start Postgres (listens on localhost:5449)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate the Prisma client
npm run db:generate

# 4. Push the schema to the database
npm run db:push

# 5. Seed an initial accountant + default Dutch BTW categories
npm run db:seed

# 6. Start the dev server
npm run dev
```

`npm run db:seed` is idempotent — running it multiple times never creates
duplicate users or categories. It creates one `ACCOUNTANT` user (email
`accountant@ledger-ocr.local` by default, overridable with
`SEED_ACCOUNTANT_EMAIL`/`SEED_ACCOUNTANT_PASSWORD` env vars) and four
default categories (`Kantoorbenodigdheden`, `Reiskosten`, `Representatie`,
`Verzekeringen`) with Dutch BTW rates (0%/9%/21%) and deductible flags.
This seed password is a **dev-only credential**, not a real secret.

Other useful scripts:

- `npm run db:reset` — force-reset the database schema and re-seed it (destructive, local dev only).
- `npm run lint` — run ESLint.
- `npm run build` — production build.

## Health check

`GET /api/health` verifies database connectivity (confirms Prisma can
reach the Postgres instance).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
