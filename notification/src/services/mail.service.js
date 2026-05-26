import { BrevoClient, BrevoEnvironment } from "@getbrevo/brevo";
import { render } from "@react-email/render";

const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
  environment: BrevoEnvironment.Production,
});

/**
 * Send transactional email
 */
export async function sendEmail({
  to,
  subject,
  template,
  templateProps = {},
  text,
}) {
  try {
    if (!to || !subject || !template) {
      throw new Error(
        "sendEmail: 'to', 'subject', and 'template' are required",
      );
    }

    // Render React Email component → HTML
    const html = await render(template(templateProps));

    const data = await client.transactionalEmails.sendTransacEmail({
      sender: {
        name: "HyperStack Team",
        email: process.env.BREVO_SENDER_EMAIL,
      },

      to: [{ email: to }],

      subject,

      htmlContent: html,

      ...(text && { textContent: text }),
    });

    console.log(
      "Email sent:",
      to,
      "| Message ID:",
      data.messageId,
    );

    return data;
  } catch (error) {
    console.error("Email send failed:", error);
    throw error;
  }
}

