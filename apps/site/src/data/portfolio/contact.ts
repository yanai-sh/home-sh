export const contact = {
  id: 'contact',
  titleId: 'contact-title',
  eyebrow: 'Contact',
  title: 'Email me.',
  deck: "Send a short note with context. I'll reply when I can.",
  primaryLabel: 'Email me',
  emailSubject: 'Hello from yanai.sh',
  actionsLabel: 'Contact actions',
  form: {
    label: 'Contact form',
    directLabel: 'Direct contact',
    fields: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      website: 'Website',
    },
    submitLabel: 'Send',
    localPreviewMessage:
      'The form is enabled on the deployed site. Local preview uses direct email.',
    directEmailPrefix: 'Email',
    statusMessages: {
      captcha: 'complete the captcha first',
      sending: 'sending...',
      sent: 'sent - thanks',
      networkError: 'network error - try again',
    },
  },
} as const;
