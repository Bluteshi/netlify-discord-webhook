import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "OK" };
  }

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const publicKey = process.env.SENDGRID_PUBLIC_KEY;

  // 1️⃣ Get headers
  const signature = event.headers["x-twilio-email-event-webhook-signature"];
  const timestamp = event.headers["x-twilio-email-event-webhook-timestamp"];

  if (!signature || !timestamp) {
    return { statusCode: 400, body: "Missing signature headers" };
  }

  // 2️⃣ Construct the message to verify
  const payload = timestamp + event.body;
  console.log("Payload length:", payload.length);
  console.log("Signature length:", signature.length);
  console.log("Public key length:", publicKey.length);

  const signatureBytes = naclUtil.decodeBase64(signature);
  const messageBytes = naclUtil.decodeUTF8(payload);
  const publicKeyBytes = naclUtil.decodeBase64(publicKey);

  console.log("Signature bytes length:", signatureBytes.length);
  console.log("Message bytes length:", messageBytes.length);
  console.log("Public key bytes length:", publicKeyBytes.length);

  const verified = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );

  console.log("Verification result:", verified);

  if (!verified) {
    return { statusCode: 403, body: "Invalid signature" };
  }

  // 3️⃣ Parse events
  const events = JSON.parse(event.body);

  // 4️⃣ Send each event to Discord
  for (const e of events) {
    const message = `📧 **SendGrid Event**
Email: ${e.email}
Event: ${e.event}
Timestamp: ${e.timestamp}
ID: ${e["sg_message_id"]}`;

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  }

  return { statusCode: 200, body: "OK" };
}