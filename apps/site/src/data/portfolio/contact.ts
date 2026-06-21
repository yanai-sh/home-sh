export const contact = {
  title: "Email me.",
  deck: "Send a short note with context. I'll reply when I can.",
  form: {
    label: "Contact form",
    fields: {
      name: "Name",
      email: "Email",
      message: "Message",
      website: "Website",
    },
    submitLabel: "Send",
    placeholders: {
      name: "Your name…",
      email: "you@example.com…",
      message: "What’s this about?…",
    },
    previewSubmitMessage: "Preview only: email sends from yanai.sh.",
    statusMessages: {
      captcha: "complete the captcha first",
      sending: "Sending…",
      sent: "sent - thanks",
      networkError: "network error - try again",
      invalidEmail: "enter a valid email address",
      missingFields: "fill in name, email, and message",
    },
  },
} as const;
