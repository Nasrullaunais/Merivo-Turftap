// Auth0 runs this for every phone code (Branding > Phone Provider > Custom; docs/architecture/deployment.md).
// It only forwards the code: the API decides whether it goes by WhatsApp or SMS.
exports.onExecuteCustomPhoneProvider = async (event, api) => {
  const { message_type, recipient, code } = event.notification;
  if (!message_type.startsWith("otp")) return;

  const reply = await fetch(`${event.secrets.API_URL}/hooks/auth0/send-code`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${event.secrets.HOOK_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ phone: recipient, code }),
  });
  if (reply.ok) return;
  const reason = `TurfTap API replied ${reply.status}`;
  if (reply.status >= 500) api.notification.retry(reason);
  else api.notification.drop(reason);
};
