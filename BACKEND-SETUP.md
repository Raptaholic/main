# Novu Peptides - Backend Setup (Supabase)

The site runs in two modes:

- **Local demo mode** (right now): accounts and orders are saved in each
  visitor's own browser. Orders placed on a customer's phone are NOT visible
  on your dashboard. Good for testing the design, not for real business.
- **Backend mode**: accounts and orders live in a real Postgres database.
  Every order from every customer appears on the moderator dashboard
  automatically (live, no refresh needed). Accounts work across devices,
  passwords are handled server-side, and email verification is built in.

Follow these steps to switch on backend mode. Takes about 15 minutes.

## Step 1 - Create the project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Name it `novu-peptides`, pick a strong database
   password (save it somewhere), choose a region close to the UAE
   (e.g. `ap-south-1` Mumbai), and create.

## Step 2 - Create the database tables

1. In your project, open **SQL Editor** (left sidebar) > **New query**.
2. Copy the entire contents of `supabase-setup.sql` (in this repo), paste,
   and click **Run**. You should see "Success. No rows returned".

## Step 3 - Configure authentication

1. Go to **Authentication > Sign In / Up > Email**.
2. **Email verification**: "Confirm email" is ON by default. Leave it ON if
   you want users to verify their email before signing in (recommended -
   this is the email verification you asked about, free, built in).
   Turn it OFF if you want signups to work instantly with no verification.
3. Go to **Authentication > URL Configuration** and set your Site URL to
   wherever the site is hosted (you can update this later).

## Step 4 - Connect the website

1. In Supabase go to **Project Settings > API Keys**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `index.html`, search for `SB_URL`, and fill in both values:

```js
const SB_URL='https://YOURPROJECT.supabase.co';
const SB_KEY='eyJhbGciOi...your anon key...';
```

The anon key is designed to be public - it is safe to ship in the page
because Row Level Security (set up by the SQL script) controls what anyone
can actually read or write.

## Step 5 - Create the moderator accounts

1. Tom Reed and John Pork each create a normal account on the website using
   their **real email addresses** (they will need to receive the
   verification email if verification is ON).
2. Back in the Supabase **SQL Editor**, run (with their real emails):

```sql
update public.profiles
  set role = 'moderator', first_order_used = true
  where email in ('tom-real-email@gmail.com', 'john-real-email@gmail.com');
```

3. Next time they sign in on the site, they land on the moderator dashboard.

## Step 6 - Test the loop

1. In a private/incognito window, create a test customer account.
2. Place a test order.
3. On the moderator dashboard (normal window), the order appears
   automatically within a second or two - no refresh.
4. Confirm it with a delivery estimate, click the WhatsApp button, verify
   the prefilled message, then mark Delivered.
5. In the incognito window, open My Orders and verify the status updated.

## What stays the same

- Order email alerts to novupeptides@gmail.com still fire on every order
  (remember to click the one-time FormSubmit activation link in the first
  email).
- The WhatsApp notify buttons on the dashboard work the same way.
- If `SB_URL`/`SB_KEY` are ever blank or Supabase is unreachable at load
  time, the site falls back to local demo mode instead of breaking.

## Free tier limits (plenty to start)

- 500 MB database (tens of thousands of orders)
- 50,000 monthly active users
- Unlimited API requests
- 30 verification emails per hour (enough for normal signup traffic; can be
  raised later by plugging in a free SMTP provider like Resend)
