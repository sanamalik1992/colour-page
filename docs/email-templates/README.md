# Colour.page auth email templates

Branded HTML for the Supabase Auth emails, so they match Colour.page (gold /
rainbow) instead of the default Supabase look.

These are **pasted into the Supabase dashboard**, not used by the app at build
time — they live here only so they're version-controlled and easy to re-paste.

## How to apply

Supabase dashboard → **Authentication → Email Templates**. For each template
below, set the **Subject** and paste the file's HTML into **Message (HTML)**:

| Supabase template | File | Suggested subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `Confirm your email for Colour.page 🎨` |
| Magic Link | `magic-link.html` | `Your Colour.page sign-in link 🔑` |
| Reset Password | `reset-password.html` | `Reset your Colour.page password` |

## Notes

- Each template uses Supabase's `{{ .ConfirmationURL }}` variable for the action
  link — **don't rename it**; Supabase injects the real URL there.
- The sender **name** ("Colour.page") and **from** address come from the SMTP
  settings, not these templates — set those under
  **Authentication → Emails → SMTP Settings** (custom SMTP via Resend:
  host `smtp.resend.com`, port `465`, username `resend`, password = a Resend
  API key, sender `noreply@colour.page`).
- The action link honours your app's `emailRedirectTo`
  (`/auth/callback?next=…`), so after confirming, users land back in the app.
