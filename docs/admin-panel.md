# Platform admin panel

A trusted **platform admin** can create user accounts and attach each one to a
PB, from inside the app — without opening the Supabase dashboard. That is the
panel's only job: add a user + set their PB name. Everything is free tier.

## Security model (three layers)

1. **Database gate.** `admin_create_user` is a `security definer` function whose
   first line checks the caller is in `platform_admins`. Anyone else gets
   `forbidden`, even if they call the API directly. This is the real enforcement.
2. **Not self-serve.** The `platform_admins` table has no insert/update/delete
   policy, so it can only be changed from the Supabase dashboard (SQL / service
   role). Nobody can make themselves an admin through the app.
3. **UI routing.** The admin panel only renders for accounts that are actually
   platform admins. Choosing "Admin" at login as a non-admin signs you straight
   back out with a clear message.

## One-time setup

1. **Run the migration:** Supabase dashboard → SQL Editor → paste all of
   `supabase/migrations/20261117000000_admin_panel.sql` → Run. Safe to re-run.
2. **Make yourself the first platform admin** (replace the email):
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'muchlis.firmansyah@gmail.com'
   on conflict do nothing;
   ```
   There is no in-app way to grant admin, by design — the first one is set here.
3. Deploy the app.

To add or remove other platform admins later, run the same insert (or a
`delete from public.platform_admins where user_id = ...`) in the dashboard.

## Using it

1. On the login screen choose **Admin**, sign in with your Gmail + password.
2. In the panel, fill **Email (Gmail)**, **Password sementara** (or tap the
   shuffle button for a random one), and **Nama PB**, then **Buat user**.
   - If the PB name is new it is created; if it already exists the user is added
     to that PB as a co-admin.
3. The created account appears under **Dibuat sesi ini** with its password and a
   **Salin** button, so you can send the credentials to the user. The password
   is shown only while the panel stays open — copy it now.

The new user signs in on the normal **Host** tab with that Gmail +
password, and goes straight to their PB (no "create PB" step, because they are
already linked).

## Notes

- The panel creates the auth account directly in the database (same approach as
  the rest of this project's SQL functions), so no service-role key is exposed
  to the browser and no Edge Function needs deploying.
- Passwords are stored only as bcrypt hashes, exactly like dashboard-created
  users; the plain password is never saved anywhere server-side.
- Test it once end to end after setup: create a user, then sign in as that user
  on the Host tab. If anything fails, you can still create users the old way
  (Supabase dashboard → Authentication → Users → Add user, with Auto Confirm).
