# PostHog Setup Guide

## Environment Variables

Add these environment variables to your `.env.local` file:

```env
# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_public_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_KEY=your_posthog_private_key_here
POSTHOG_HOST=https://app.posthog.com
```

## Getting Your PostHog Keys

1. Go to your PostHog project dashboard
2. Navigate to Settings > Project API Keys
3. Copy the "Project API Key" (this is your `NEXT_PUBLIC_POSTHOG_KEY`)
4. Copy the "Personal API Key" (this is your `POSTHOG_KEY`)

## Installation

After adding the environment variables, install the PostHog dependencies:

```bash
npm install
```

## Events Being Tracked

### Web App Events
- `user_logged_in` - When a user signs in
- `user_logged_out` - When a user signs out
- `snippet_created` - When a snippet is created
- `snippet_edited` - When a snippet is edited
- `snippet_deleted` - When a snippet is deleted
- `snippet_copied` - When a snippet is copied to clipboard
- `snippet_shared` - When a snippet is shared
- `context_menu_toggled` - When context menu is enabled/disabled
- `shared_snippet_copied` - When a shared snippet is copied to user's snippets

### Extension Events
- `extension_connected` - When extension connects to web app
- `extension_snippets_loaded` - When snippets are loaded in extension
- `snippet_copied_via_extension` - When snippet is copied via extension

### API Events
- `api_request_made` - When API endpoints are called
- `snippets_fetched` - When snippets are fetched via API
- `snippet_created_via_api` - When snippet is created via API

## Privacy

The tracking implementation respects user privacy by:
- Only tracking snippet titles, never content
- Using user IDs for identification
- Not collecting sensitive personal information
- Allowing users to opt-out if needed

## Testing

To test that tracking is working:

1. Open your PostHog dashboard
2. Go to Live Events
3. Perform actions in your app (create snippets, copy, etc.)
4. You should see events appearing in real-time 