# ClickMemory Web App Deployment Guide

This guide will help you deploy the ClickMemory web application to Vercel and set up the necessary environment variables.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the database schema set up
2. **GitHub Account**: For version control and Vercel integration
3. **Vercel Account**: For hosting the application

## Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key

### 1.2 Run Database Migrations

1. Go to your Supabase dashboard → SQL Editor
2. Run the following SQL scripts in order:

```sql
-- Initial schema (if not already created)
-- Run the SQL from the cursor_instructions.md file

-- API Keys table
CREATE TABLE user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Chrome Extension',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for API keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" ON user_api_keys
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON user_api_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON user_api_keys
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON user_api_keys
FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster API key lookups
CREATE INDEX idx_user_api_keys_api_key ON user_api_keys(api_key);
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
```

## Step 2: Environment Variables

### 2.1 Local Development

Create a `.env.local` file in the `click-memory-app` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.2 Vercel Deployment

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `click-memory-app`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3.2 Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-app.vercel.app`

## Step 4: Configure Supabase Auth

### 4.1 Update Site URL

1. Go to your Supabase dashboard → Authentication → URL Configuration
2. Set Site URL to your Vercel domain: `https://your-app.vercel.app`
3. Add redirect URLs:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/dashboard`

### 4.2 Update CORS Settings

1. Go to Supabase dashboard → Settings → API
2. Add your Vercel domain to the allowed origins

## Step 5: Test the Application

### 5.1 Test Web App

1. Visit your deployed app
2. Create an account and log in
3. Create some test snippets
4. Test the sharing functionality

### 5.2 Test API Endpoints

Test the API endpoints using curl or Postman:

```bash
# Test API key generation (requires authentication)
curl -X POST https://your-app.vercel.app/api/keys/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie"

# Test snippets API with API key
curl -X GET https://your-app.vercel.app/api/snippets \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

## Step 6: Chrome Extension Setup

### 6.1 Update Extension Configuration

1. Open `click-memory-extension/popup.js`
2. Update the `DEFAULT_WEB_APP_URL` constant to your Vercel domain:

```javascript
const DEFAULT_WEB_APP_URL = 'https://your-app.vercel.app';
```

### 6.2 Test Extension

1. Load the extension in Chrome (Developer mode)
2. Generate an API key from your web app
3. Configure the extension with the API key
4. Test snippet loading and copying

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your Vercel domain is added to Supabase CORS settings
2. **Authentication Issues**: Check that your Supabase auth URLs are correctly configured
3. **API Key Errors**: Verify the service role key is set correctly
4. **Build Failures**: Check that all environment variables are set in Vercel

### Environment Variable Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`

### Database Checklist

- [ ] User API keys table created
- [ ] RLS policies configured
- [ ] Indexes created for performance
- [ ] Auth triggers working

## Security Considerations

1. **Service Role Key**: Keep this secret and only use it server-side
2. **API Keys**: Users can revoke their own API keys from the web app
3. **CORS**: Only allow necessary origins
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Monitoring

1. **Vercel Analytics**: Monitor app performance and errors
2. **Supabase Logs**: Check for database and auth issues
3. **API Usage**: Monitor API key usage in the database

## Next Steps

1. **Custom Domain**: Set up a custom domain for your app
2. **SSL Certificate**: Ensure HTTPS is working correctly
3. **Backup Strategy**: Set up database backups
4. **Monitoring**: Implement error tracking and analytics 