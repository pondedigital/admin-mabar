# Sign-in with Gmail: setup and operations

Everything here runs on the Supabase **free plan**. No Google Cloud project,
OAuth client, or paid email provider is needed, and the app sends no emails.

## How sign-in works now

| Who | What they do |
| --- | --- |
| **New paying user** | You create the account in the Supabase dashboard. They sign in with Gmail + password. On first sign-in they create their PB and become its admin. |
| **Existing user (old username login)** | One time only, on the login screen: "Pindahkan ke Gmail". They enter their old username, old password, and their Gmail. The same account moves to that Gmail, keeping its PB access, players, sessions, and history. The password stays the same. |
| **Anyone else** | Cannot register. The app has no sign-up screen. |

Only `@gmail.com` (and Google's alias `@googlemail.com`) addresses are accepted,
both in the app and inside the database function.

## One-time setup (about 5 minutes)

1. **Run the migration.** Supabase dashboard → SQL Editor → New query → paste
   all of `supabase/migrations/20261116000000_gmail_login_and_pb_onboarding.sql`
   → Run. Running it again is safe.
2. **Turn off public sign-ups.** Dashboard → Authentication → Sign In / Providers
   → turn off **Allow new users to sign up**. You can still create users from
   the dashboard; strangers can no longer call the sign-up API directly.
3. **Deploy the app** as usual.

Order matters a little: if the new app is deployed before step 1, the
"Pindahkan ke Gmail" and "Buat PB" steps fail with a generic error until the
migration is run. Normal Gmail sign-in works either way.

## Creating an account for a paying user

Dashboard → Authentication → Users → **Add user** → **Create new user**:

- Email: their Gmail address
- Password: a temporary password you send them
- Tick **Auto Confirm User** (otherwise they cannot sign in, since no
  confirmation email is sent)

On first sign-in they see "Buat PB kamu" and become admin of the PB they name.

To give an account access to an **existing** PB instead, add a row before
they sign in:

```sql
insert into public.pb_admins (pb_id, admin_id)
select pbs.id, u.id
from public.pbs, auth.users u
where pbs.name = 'PB Windo' and u.email = 'their.name@gmail.com';
```

Password reset: the app has no "set new password" screen, so set a temporary
password from the SQL Editor and send it to the user:

```sql
update auth.users
set encrypted_password = extensions.crypt('TEMPORARY-PASSWORD', extensions.gen_salt('bf'))
where email = 'their.name@gmail.com';
```

## Legacy account claim: safety details

- Verified in the database (`claim_legacy_account`) by checking the old
  password hash; the app never sees other users' emails.
- 5 wrong attempts for one username lock it for 15 minutes; more than 30 wrong
  attempts overall in 5 minutes pause all claims briefly.
- Only accounts that are not already on a Gmail address can be claimed, so a
  claimed account cannot be moved again through this screen.
- The Gmail must not belong to another account.

The function updates `auth.users.email` directly instead of using Supabase's
"change email" flow. That flow sends confirmation emails to both the old and
new address, and the old addresses are placeholders that cannot receive mail.

**After everyone has moved**, you can close the old username lookup (it lets
anyone look up an email by username). Uncomment and run section 4 at the
bottom of the migration file.
