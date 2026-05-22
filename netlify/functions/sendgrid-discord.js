import { createVerify } from "crypto";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "OK" };
  }

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const publicKeyPem = process.env.SENDGRID_PUBLIC_KEY;

  const signature = event.headers["x-twilio-email-event-webhook-signature"];
  const timestamp = event.headers["x-twilio-email-event-webhook-timestamp"];

  if (!signature || !timestamp) {
    return { statusCode: 400, body: "Missing signature headers" };
  }

  const payload = timestamp + event.body;
  const signatureBuffer = Buffer.from(signature, "base64");
  const publicKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;

  const verifier = createVerify("SHA256");
  verifier.update(payload);
  verifier.end();

  let verified = false;
  try {
    verified = verifier.verify(publicKeyFormatted, signatureBuffer);
  } catch (error) {
    console.error("Verification error:", error.message);
    return { statusCode: 403, body: "Signature verification failed" };
  }

  if (!verified) {
    return { statusCode: 403, body: "Invalid signature" };
  }

  const events = JSON.parse(event.body);

  // 🔍 Log full raw payload — check your function logs to explore all fields
  console.log("RAW SENDGRID PAYLOAD:", JSON.stringify(events, null, 2));

  for (const e of events) {
    // Known fields across event types
    const templateId = e.template_id || e["template_id"] || "N/A";
    const templateVersionId = e.template_version_id || "N/A";
    const url = e.url || null;                          // 'click' events
    const urlOffset = e.url_offset || null;             // 'click' events - which link index
    const useragent = e.useragent || null;              // 'click' / 'open' events
    const ip = e.ip || null;                           // 'click' / 'open' events
    const reason = e.reason || null;                   // 'bounce' / 'deferred' events
    const status = e.status || null;                   // bounce SMTP status code
    const asmGroupId = e.asm_group_id || null;         // unsubscribe group
    const marketingCampaignId = e.marketing_campaign_id || null;
    const marketingCampaignName = e.marketing_campaign_name || null;
    const category = Array.isArray(e.category)
      ? e.category.join(", ")
      : e.category || null;
    const uniqueArgs = e.unique_args                   // custom args you set on send
      ? JSON.stringify(e.unique_args)
      : null;

    // Build a rich message, only showing fields that exist
    const lines = [
      `📧 **SendGrid — \`${e.event}\`**`,
      `**Email:** ${e.email}`,
      `**Time:** <t:${e.timestamp}:f>`,
      `**Message ID:** \`${e["sg_message_id"] ?? "N/A"}\``,
      templateId !== "N/A"        && `**Template ID:** \`${templateId}\``,
      templateVersionId !== "N/A" && `**Template Version:** \`${templateVersionId}\``,
      url                         && `**Clicked URL:** ${url}`,
      urlOffset                   && `**Link Index:** ${urlOffset.index}`,
      useragent                   && `**User Agent:** ${useragent}`,
      ip                          && `**IP:** ${ip}`,
      reason                      && `**Reason:** ${reason}`,
      status                      && `**SMTP Status:** ${status}`,
      category                    && `**Category:** ${category}`,
      asmGroupId                  && `**Unsub Group:** ${asmGroupId}`,
      marketingCampaignName       && `**Campaign:** ${marketingCampaignName} (\`${marketingCampaignId}\`)`,
      uniqueArgs                  && `**Custom Args:** \`${uniqueArgs}\``,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines }),
    });
  }

  return { statusCode: 200, body: "OK" };
}
