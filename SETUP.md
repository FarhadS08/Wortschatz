# Setting up accounts (Supabase)

The app works without any of this: everything then stays in each visitor's browser.
These steps switch on accounts, so people can sign in with Google or an email link,
keep their words in their account and use several devices.

You need about 30 minutes. Nothing here costs money on the free plans.

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

## 3. Connect the app

1. In Supabase, open **Project Settings** → **API Keys** (or **API**).
2. Copy the **Project URL** and the **Publishable key** (older projects: the **anon public** key).
3. In GitHub, open [`config.js`](config.js), click the pencil to edit, paste both values
   between the quotes, and commit:

   ```js
   window.WS_CONFIG = {
     supabaseUrl: 'https://abcdefgh.supabase.co',
     supabaseAnonKey: 'sb_publishable_…'
   };
   ```

Both values are meant to be public. **Never** put the *secret* / *service_role* key
anywhere in the app or in chat.

## 4. Sign-in addresses

The landing page lives at `/`, the app at `/app`. Sign-in has to come back to the app.
In Supabase, open **Authentication** → **URL Configuration**:

- **Site URL:** your app's address, for example `https://your-domain.com/app`
- **Redirect URLs:** add `https://your-domain.com/**`
  (and, while testing, your Vercel address, e.g. `https://flashcard-xyz.vercel.app/**`)

## 5. Email sign-in (link + code)

Supabase's built-in mailer only sends about 2 emails per hour and only to your own
team, so for real users you need a mail service. [Resend](https://resend.com) has a
free tier:

1. Sign up at Resend, **Domains** → **Add domain**, and add the DNS records it shows
   at your domain registrar. Wait until the domain is *verified*.
2. Resend → **API Keys** → create a key (it is the SMTP password).
3. Supabase → **Authentication** → **Emails** → **SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the Resend key
   - Sender email: e.g. `login@your-domain.com`, sender name: `Wortschatz`
4. Supabase → **Authentication** → **Rate Limits**: raise *emails per hour* if you
   expect many sign-ups (the default with custom SMTP is 30).

The app lets people either tap the link in the email **or** type the code from it
(handy when the email arrives on another device). For the code to appear, edit both
email templates under **Authentication** → **Emails** → **Templates** —
*Magic Link* and *Confirm signup* — and use this body:

```html
<h2>Your Wortschatz sign-in</h2>
<p><a href="{{ .ConfirmationURL }}">Sign in to Wortschatz</a></p>
<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
<p>If you didn't ask for this, you can ignore this email.</p>
```

## 6. Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com), create a project
   (e.g. `wortschatz`).
2. **APIs & Services** → **OAuth consent screen**: user type *External*, app name
   *Wortschatz*, your support email, your app's address as homepage. Add the scopes
   `email`, `profile`, `openid` (the defaults). Publish the app when you go live.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
   → *Web application*. Under **Authorized redirect URIs** add:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (Supabase shows this exact address on its Google provider page).
4. Copy the **Client ID** and **Client secret**.
5. Supabase → **Authentication** → **Providers** → **Google** → enable, paste both, save.

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
