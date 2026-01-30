# Netlify SendGrid to Discord Webhook

A Netlify function that receives SendGrid email event webhooks, verifies their signatures using TweetNaCl, and forwards the events to a Discord webhook.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in your Netlify dashboard or `.env` file:
   - `DISCORD_WEBHOOK_URL`: Your Discord webhook URL
   - `SENDGRID_PUBLIC_KEY`: Your SendGrid webhook public key for signature verification

3. Deploy to Netlify:
   - Create a new Netlify site
   - Connect your repository
   - Set the build command to `npm run build` (if needed) or just deploy the function
   - For Netlify functions, place this in `netlify/functions/` directory

## Usage

Configure your SendGrid webhook to point to your Netlify function URL. The function will:

1. Verify the webhook signature using the provided public key
2. Parse the email events
3. Send formatted messages to your Discord channel

## Event Format

Each SendGrid event is formatted as:

```
📧 **SendGrid Event**
Email: [email]
Event: [event_type]
Timestamp: [timestamp]
ID: [sg_message_id]
```

## Security

The function verifies webhook signatures to ensure authenticity. Make sure to keep your SendGrid public key secure.