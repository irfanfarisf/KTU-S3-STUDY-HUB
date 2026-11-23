# KTU S3 Study Hub

A React and TypeScript study portal backed directly by Supabase Postgres, Auth, and Storage. The browser uses the Supabase anon/publishable key; Row Level Security controls published study content, admin editing, and private student records. The deployed frontend does not call the legacy Express/SQLite API.

Students can browse published content without an account. Signing in lets them sync bookmarks, completed topics, and practiced questions across devices. Existing browser-local progress is merged into the first signed-in account on that device.

## Configure Supabase

The local `.env.local` already contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The configured project is reachable, but its `public.universities` table was not installed when checked. Install the schema before running the app:

1. In the Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`, then `supabase/migrations/002_student_accounts_and_import.sql`, and then `supabase/migrations/003_resource_uploads_and_syllabi.sql`.
2. Enable email/password sign-up in Supabase Auth. Set the project's Site URL to the app origin and add `http://localhost:5173/**` plus the deployed site's `https://<your-render-site>/**` to the redirect URL allowlist. Email confirmation can remain enabled; the account page explains the confirmation step.
3. Create the administrator in **Authentication → Users** and confirm its email. Then add that Auth user's UUID to `public.admins` in SQL Editor:

   ```sql
   INSERT INTO public.admins (id, email, name, role)
   SELECT id, email, 'Study Hub Administrator', 'superadmin'
   FROM auth.users
   WHERE lower(email) = lower('admin@example.com')
   ON CONFLICT (id) DO UPDATE
     SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role;
   ```

   Replace the example email. Admin sign-in uses the same Supabase Auth page as students; only users listed in `public.admins` can access the CMS.

Never put a Supabase service-role or secret key in a `VITE_` variable or in the deployed frontend. The anon/publishable key is the only key used by the app, and it relies on the policies in these migrations.

## Import existing local study content

The existing SQLite database contains seeded subjects, modules, questions, notes, and revision items. The one-time importer preserves row IDs, uploads local resource files to the `study-resources` bucket, and advances Postgres sequences. It does not copy the local admin password.

1. Apply both SQL migrations and create the Supabase admin first.
2. Put the Supabase **service-role/secret key** in the ignored `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` (or set it only in the current shell). This key is read by the one-time import script and is never read by the frontend.
3. Run `npm run migrate:sqlite-to-supabase`. The script reads `data/studyhub.db` and `storage/uploads` by default. Override `SQLITE_DB_PATH`, `APP_DATA_DIR`, or `UPLOADS_DIR` if needed.
4. Remove the service-role key from `.env.local` after the import. It is not required at runtime.

The import uses upserts keyed by existing row IDs, so it can be rerun after fixing an interrupted import. Check the reported missing uploads; those resource rows will be imported without a file link.

If the importer reports `permission denied for table ...`, run these grants in Supabase SQL Editor and rerun the import:

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

## Run locally

Requires Node.js 22.13 through 24.x.

```sh
npm ci
npm run dev
```

Vite runs the app at `http://localhost:5173`. The page reads Supabase settings from `.env.local`; no local API server is needed. The old server source remains available for local database migration but is not started by the app scripts.

## Deploy

`render.yaml` deploys the Vite build as a static site and rewrites client-side routes to `index.html`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables in Render. Use the same URL and anon/publishable key as `.env.local`. Configure the Supabase Auth Site URL and redirect allowlist to include the deployed Render URL.

## Commands

- `npm run dev` — run Vite in development mode
- `npm run build` — build the frontend into `dist`
- `npm start` — preview the production build locally
- `npm run typecheck` — run TypeScript without emitting files
- `npm run migrate:sqlite-to-supabase` — one-time privileged import from the current SQLite database
