# Google OAuth Configuration for Synapse

To configure Google OAuth across local, staging, and production environments:

---

## 1. Google Cloud Console (APIs & Services ➔ Credentials)
1. In your Google Cloud OAuth 2.0 Client ID settings, add:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (Local development)
     - `https://your-domain.vercel.app` (Vercel production)
     - `https://your-domain.com` (Custom domain, if any)
     - `https://<your-supabase-project>.supabase.co` (Supabase Auth origin)
   - **Authorized redirect URIs**:
     - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
     - *(e.g. `https://pdzeubayvgpgoufcaajm.supabase.co/auth/v1/callback`)*

---

## 2. Supabase Dashboard (Authentication ➔ URL Configuration)
Under **Authentication ➔ URL Configuration**:
1. **Site URL**:
   Set this to your deployed production URL:
   - `https://your-domain.vercel.app` (or `https://your-domain.com`)
   > ⚠️ **Important**: Do **not** leave Site URL set to `http://localhost:3000` in Supabase when deploying to Vercel, as Supabase will fallback to localhost if a redirect mismatch occurs.

2. **Redirect URLs** (Add all of these patterns with wildcards `/**`):
   - `http://localhost:3000/**` *(enables local development)*
   - `https://*.vercel.app/**` *(enables all Vercel previews & deployments)*
   - `https://your-domain.vercel.app/**` *(your main Vercel app)*
   - `https://your-domain.com/**` *(custom domain, if applicable)*

---

## 3. Supabase Dashboard (Authentication ➔ Providers ➔ Google)
1. Enable the **Google** provider.
2. Enter your **Google Client ID** and **Google Client Secret**.

---

## 4. Environment Variables on Vercel
In your Vercel project settings (**Settings ➔ Environment Variables**):
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://pdzeubayvgpgoufcaajm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```
*(Ensure `NEXT_PUBLIC_SITE_URL` on Vercel is set to your Vercel URL, not `http://localhost:3000`)*
