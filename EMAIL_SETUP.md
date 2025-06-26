# Email Setup Guide for ClickMemory

## Overview
This guide will help you set up email functionality using Resend for sending snippet invitations and notifications.

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Get API Key

1. In your Resend dashboard, go to "API Keys"
2. Create a new API key
3. Copy the API key (starts with `re_`)

## Step 3: Environment Variables

Add these to your `.env.local` file:

```env
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Service Role Key (for server-side auth)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 4: Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Create pending_shares table for email invitations
CREATE TABLE pending_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snippet_id UUID REFERENCES snippets(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  permission TEXT CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(snippet_id, email)
);

-- Row Level Security Policies for pending_shares
CREATE POLICY "Snippet owners can view their pending shares" ON pending_shares FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM snippets WHERE id = snippet_id)
);

CREATE POLICY "Snippet owners can insert pending shares" ON pending_shares FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM snippets WHERE id = snippet_id)
);

CREATE POLICY "Snippet owners can delete pending shares" ON pending_shares FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM snippets WHERE id = snippet_id)
);

-- Enable RLS
ALTER TABLE pending_shares ENABLE ROW LEVEL SECURITY;
```

## Step 5: Test the Setup

1. Start your development server: `npm run dev`
2. Try sharing a snippet with an email address
3. Check the console for email logs
4. Check your Resend dashboard for sent emails

## Development vs Production

### Development (Current Setup)
- **Sender Email**: `onboarding@resend.dev` (Resend's default)
- **No Domain Verification Required**
- **Perfect for testing**

### Production Setup
1. **Verify Domain** in Resend dashboard
2. **Update sender email** in `/app/api/send-email/route.ts`:
   ```typescript
   from: 'ClickMemory <noreply@yourdomain.com>'
   ```
3. **Update App URL** in environment variables:
   ```env
   NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
   ```

## Troubleshooting

### Common Issues:

1. **"Domain not verified" error**: 
   - **Development**: Use `onboarding@resend.dev` (already configured)
   - **Production**: Verify your domain in Resend dashboard

2. **"Unauthorized" error**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

3. **"Failed to send email"**: Check your Resend API key and domain verification status

4. **Emails not received**: Check spam folder and domain verification status

## Email Templates

The current email templates are basic HTML. You can customize them in `/app/api/send-email/route.ts`:

- **Invitation emails**: Sent to new users with a link to join and view the snippet
- **Notification emails**: Sent to existing users when snippets are shared with them

## Next Steps

1. **Customize email templates** with your branding
2. **Add email tracking** (Resend provides analytics)
3. **Implement invitation acceptance flow** (create `/invite/[id]` page)
4. **Add email preferences** for users

## Cost

- **Resend Free Tier**: 3,000 emails/month
- **Additional emails**: $0.80 per 1,000 emails
- **No setup fees or monthly charges** 