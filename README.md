# colour.page

AI-powered colouring page generator and curated print library. Upload any photo and get a print-ready A4 colouring page, or browse our library of original colouring sheets.

## Features

- **Photo to Colouring Page** – Upload JPG/PNG/HEIC, get clean line art as A4 PDF + PNG
- **My Library** – All your generated pages saved and downloadable
- **Print Pages** – Browse curated, original colouring sheets by category and season
- **Admin Panel** – Upload and manage print pages (admin role required)
- **Pro Tier** – Unlimited generations, no watermarks, priority processing

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Supabase (Postgres + Storage)
- **AI**: Replicate (Flux Kontext Pro) with Sharp CV fallback
- **PDF**: pdf-lib for A4 @ 300 DPI output
- **Payments**: Stripe subscriptions
- **Hosting**: Vercel

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Replicate (primary image processing)
REPLICATE_API_TOKEN=r8_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=https://colour.page

# Optional
CRON_SECRET=your-cron-secret      # Protects worker endpoint
ANTHROPIC_API_KEY=sk-ant-...       # For content generation
```

## Database Setup

Run the SQL migrations in order in the Supabase SQL Editor:

1. `supabase-schema.sql` – Core tables (colouring_pages, trending_topics, etc.)
2. `supabase-pro-schema.sql` – Stripe/Pro subscription tables
3. `supabase-upgrade-migration.sql` – Photo jobs, print pages, profiles, RLS policies

After running migrations, create the storage buckets:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('outputs', 'outputs', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('print-pages', 'print-pages', true) ON CONFLICT DO NOTHING;
```

To make yourself an admin:

```sql
INSERT INTO profiles (email, is_admin) VALUES ('your@email.com', true);
```

## How Processing Works

### Photo → Colouring Page Pipeline

1. **Upload**: User uploads photo (JPG/PNG/HEIC). HEIC is converted to PNG automatically.
2. **Preprocessing** (Stage A): Orientation correction, denoising (median filter), contrast normalization, greyscale conversion using Sharp.
3. **Line Extraction** (Stage B):
   - **Primary**: Replicate API (Flux Kontext Pro) generates clean line art with configurable thickness and detail levels.
   - **Fallback**: Sharp-based CV pipeline (adaptive threshold + morphological operations) runs if Replicate is unavailable or fails.
4. **PDF Rendering**: Line art is placed on A4 (2480×3508px at 300 DPI) with 10mm margins using pdf-lib. Free tier gets a subtle watermark.
5. **Storage**: PDF and PNG preview are uploaded to Supabase Storage.

### Job Queue

- Jobs are stored in `photo_jobs` table with status: `queued → processing → rendering → done/failed`
- Processing is triggered immediately via fire-and-forget fetch
- A backup cron worker runs every minute (`/api/photo-jobs/worker`) to pick up stuck jobs
- Compare-and-swap locking via `claim_next_photo_job()` prevents double-processing
- Pro users get priority in the queue

### User Settings

- **Orientation**: Portrait / Landscape
- **Line Thickness**: Thin / Medium / Thick
- **Detail Level**: Low (simple, kids) / Medium / High (intricate, adults)

## How to Add Print Packs

1. Go to `/admin/print-pages` and sign in with an admin email
2. Upload source images (SVG or PNG) – the system auto-generates:
   - A4 PDF at 300 DPI with proper margins
   - Web preview PNG
3. Set metadata: title, category, tags, season, featured status
4. Pages are saved as drafts. Click the eye icon to publish them.

**Categories**: Animals, Vehicles, Dinosaurs, Fantasy, Nature, Space, Ocean, Food, Sports, People, Buildings, Patterns

**Seasons**: Ramadan, Eid, Christmas, Halloween, Easter, Winter, Spring, Summer, Autumn, Diwali, New Year, Valentine's, Mother's Day, Father's Day

### Licensing

Only upload artwork you created or have explicit license to distribute. The admin UI includes a licensing warning. Copyrighted characters (Disney, Marvel, Pokemon, etc.) are blocked at the topic level via the `blocked_terms` table.

## Tiering

| Feature | Free | Pro (£2.99/mo) |
|---------|------|-----------------|
| Generations per day | 3 | Unlimited |
| Watermark | Yes | No |
| Queue priority | Normal | High |
| PDF download | Yes | Yes |
| Print pages library | Full access | Full access |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page with generator |
| `/create` | Photo to colouring page (full flow) |
| `/library` | User's generated pages |
| `/print-pages` | Browse curated print pages |
| `/print` | Legacy trending pages |
| `/pro` | Upgrade to Pro |
| `/admin/print-pages` | Admin: manage print pages |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel. Cron jobs configured in `vercel.json`:

- `/api/cron/generate-trending` – Daily at 2 AM (trending page generation)
- `/api/photo-jobs/worker` – Every minute (process queued photo jobs)
