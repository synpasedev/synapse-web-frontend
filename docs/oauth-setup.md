# Google OAuth Configuration for Synapse

To configure Google OAuth across local, staging, and production environments:

---

## 1. Google Cloud Console (APIs & Services ➔ Credentials)
1. In your Google Cloud OAuth 2.0 Client ID settings, add:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (Local development)
     - `https://your-domain.com` (Production)
     - `https://<your-supabase-project>.supabase.co` (Supabase Auth origin)
   - **Authorized redirect URIs**:
     - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
     - *(e.g. `https://pdzeubayvgpgoufcaajm.supabase.co/auth/v1/callback`)*

---

## 2. Supabase Dashboard (Authentication ➔ Providers ➔ Google)
1. Enable the **Google** provider.
2. Enter your **Google Client ID** and **Google Client Secret**.
3. Under **Authentication ➔ URL Configuration**:
   - **Site URL**: `https://your-domain.com` (or `http://localhost:3000` in local dev)
   - **Redirect URLs**:
     - `http://localhost:3000/api/auth/callback`
     - `https://your-domain.com/api/auth/callback`
     - `https://*.vercel.app/api/auth/callback`

---

## 3. Environment Variables
Add to your production environment (e.g. Vercel / Railway / Docker):
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://pdzeubayvgpgoufcaajm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
