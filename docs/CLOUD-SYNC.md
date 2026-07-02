# Cloud Sync

## Setup

1. Create a Supabase project.
2. Run [`docs/supabase-setup.sql`](supabase-setup.sql) in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

5. Restart the dev server or redeploy Cloudflare Pages.

## User Flow

1. Open `設定 → App 資料 → Cloud Backup`.
2. Enter email.
3. Open the magic link from email.
4. Enter a group code after login.
5. Use group upload/download to share data across devices or users.

## Security Notes

- Re-run `docs/supabase-setup.sql` after policy updates.
- Group code is an invite secret. Use at least 8 characters and share only with trusted users.
- The frontend may use Supabase anon or publishable keys.
- Never put the Supabase service role key in GitHub, Cloudflare Pages, or frontend code.
- RLS must stay enabled for `app_state_snapshots`, `group_members`, and `group_app_states`.
