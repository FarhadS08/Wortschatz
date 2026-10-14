# Setting up accounts (Supabase)

The app works without any of this: everything then stays in each visitor's browser.
These steps switch on accounts, so people can sign in with Google (and, once you have
a mail service, with an email link), keep their words in their account and use several
devices.

You need about 30 minutes. Nothing here costs money on the free plans.

Below, `your-domain.com` means your site's address: your own domain, or the address
Vercel gave you (for example `flashcard-xyz.vercel.app`). The landing page lives at `/`,
the app at `/app`.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**.
2. Name: `wortschatz`. Region: **Central EU (Frankfurt)**. Database password: generate one
   and keep it in your password manager (you won't need it for the app).
3. Wait until the project is ready (about a minute).

Free plan: 500 MB database, 50,000 monthly users. A free project pauses after a week
without any visits; once people use the app every day, that doesn't happen.

## 2. Create the tables

1. In the project, open **SQL Editor** → **New query**.
2. Open [`supabase/migrations/20261014120000_user_data.sql`](supabase/migrations/20261014120000_user_data.sql)
   in this repository, copy all of it, paste it into the editor and click **Run**.
3. It should say *Success. No rows returned*. Running it twice does no harm.

This creates two tables (`cards`, `user_state`) with row-level security: every account
can only read and change its own rows.

## 3. Google sign-in

1. In Supabase, open **Authentication** → **Sign In / Providers** (older dashboards:
   **Providers**) → **Google**, and copy the **Callback URL** shown there. It looks like
   `https://abcdefgh.supabase.co/auth/v1/callback`. Keep this tab open.
2. In a new tab, open [Google Cloud Console](https://console.cloud.google.com) and create
   a project (e.g. `wortschatz`).
3. Open **Google Auth Platform** (in older menus: **APIs & Services** → **OAuth consent
   screen**) → **Get started**: app name *Wortschatz*, your email as support email,
   audience **External**, your email as contact. Agree and create.
4. **Clients** → **Create client** → application type **Web application**:
   - **Authorized JavaScript origins:** `https://your-domain.com`
   - **Authorized redirect URIs:** the Callback URL from step 1
   - Click **Create** and copy the **Client ID** and the **Client secret**.
5. **Audience** → **Publish app** → confirm. Until you do this, only the test users
   listed there can sign in.
6. Back in Supabase (Google provider page): switch **Enable Sign in with Google** on,
   paste the Client ID and the Client secret, and **Save**.

## 4. Sign-in addresses

In Supabase, open **Authentication** → **URL Configuration**:

- **Site URL:** `https://your-domain.com/app`
- **Redirect URLs:** add `https://your-domain.com/**`
  (also add your Vercel address, e.g. `https://flashcard-xyz.vercel.app/**`, if you use
  your own domain but want to test on the Vercel one)

## 5. Switch it on

1. In Supabase, click **Connect** at the top of the project (or open **Project Settings**:
   the URL is under **Data API**, the key under **API Keys**).
2. Copy the **Project URL** and the **Publishable key** (`sb_publishable_…`; older
   projects call it the **anon public** key).
3. In GitHub, open [`config.js`](config.js), click the pencil to edit, paste both values
   between the quotes, and commit:

   ```js
   window.WS_CONFIG = {
     supabaseUrl: 'https://abcdefgh.supabase.co',
     supabaseAnonKey: 'sb_publishable_…',
     emailSignIn: false
   };
   ```

Vercel deploys the change within a minute; from then on the cloud button offers Google
sign-in. Both values are meant to be public. **Never** put the *secret* /
*service_role* key anywhere in the app or in chat.

## 6. Email sign-in (link + code) — needs your own domain

Supabase's built-in mailer only sends to your own team and about 2 emails per hour, so
real users need a mail service. Skip this step if you don't have a domain yet: the app
then offers Google sign-in only. [Resend](https://resend.com) has a free tier:

1. Sign up at Resend, **Domains** → **Add domain**, and add the DNS records it shows
   at your domain registrar. Wait until the domain is *verified*.
2. Resend → **API Keys** → create a key (it is the SMTP password).
3. Supabase → **Authentication** → **Emails** → **SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the Resend key
   - Sender email: e.g. `login@your-domain.com`, sender name: `Wortschatz`
4. Supabase → **Authentication** → **Rate Limits**: raise *emails per hour* if you
   expect many sign-ups (the default with custom SMTP is 30).
5. The app lets people either tap the link in the email **or** type the code from it
   (handy when the email arrives on another device). For the code to appear, edit both
   email templates under **Authentication** → **Emails** → **Templates** —
   *Magic Link* and *Confirm signup* — and use this body:

   ```html
   <h2>Your Wortschatz sign-in</h2>
   <p><a href="{{ .ConfirmationURL }}">Sign in to Wortschatz</a></p>
   <p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```

6. In `config.js`, change `emailSignIn: false` to `emailSignIn: true` and commit.

## 7. Clean up on Vercel

- The AI no longer runs on your key: delete the `ANTHROPIC_API_KEY` environment
  variable in your Vercel project settings.
- Keep the Upstash (KV) integration for now. Accounts from the old sync still work
  until each person signs in with Google or email once; their words move over
  automatically. The old sync is removed in a later step.

## 8. Try it

1. Open `https://your-domain.com/app`, tap the cloud button (top right) and sign in with Google.
2. Study a few cards, then open the app on your phone and sign in there too: your
   progress, your own words and your settings are there.
3. Under **KI-Funktionen** paste your Claude key (from
   [console.anthropic.com](https://console.anthropic.com/settings/keys)) and tap
   **Testen**. The key stays in that browser only.

## 9. Link previews (X, WhatsApp, …)

When someone posts your address, X shows the picture `og.png`. X needs its full address:
in `index.html`, replace `og.png` in the two lines `og:image` and `twitter:image` with
`https://your-domain.com/og.png`. Check the result with any "open graph preview" site.

## For developers

- Schema changes go into new files in `supabase/migrations/`. They are written so the
  Supabase CLI (`supabase db push`) can apply them too.
- Sync design: the browser's deck stays the working copy. Changed words are marked and
  uploaded through `push_cards()`, which merges per field group (schedule by the latest
  grading, text by the latest edit, statistics and deletion by the latest change).
  Devices pull rows changed since their last pull (by server time, with one minute of
  overlap). Built-in words that a user never touched are not stored at all.
