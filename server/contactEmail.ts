export type ContactEmailPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type EmailNotificationResult = {
  sent: boolean;
  error: string | null;
};

function hasEmailConfiguration() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.CHURCH_ADMIN_EMAIL);
}

function isEmailDeliveryEnabled() {
  return hasEmailConfiguration() && process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
}

/** Sends a server-side contact notification without exposing email credentials to visitors. */
export async function sendContactMessageEmail(payload: ContactEmailPayload): Promise<EmailNotificationResult> {
  if (!isEmailDeliveryEnabled()) {
    return { sent: false, error: "Email notification is not enabled." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [process.env.CHURCH_ADMIN_EMAIL],
        reply_to: payload.email,
        subject: `New contact message: ${payload.subject}`,
        text: [
          "A new message was received through the Community Baptist Church website.",
          "",
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          `Subject: ${payload.subject}`,
          "",
          "Message:",
          payload.message,
        ].join("\n"),
      }),
    });

    if (response.ok) return { sent: true, error: null };

    const responseText = await response.text();
    return { sent: false, error: `Email service rejected the message (${response.status}): ${responseText.slice(0, 240)}` };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "The email service request failed." };
  }
}
