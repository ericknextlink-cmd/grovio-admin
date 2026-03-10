import { emailLayout, h2Style, pStyle } from './shared'

export function contactConfirmationHtml(params: { displayName: string }): string {
  const { displayName } = params
  const content = `
    <h2 style="${h2Style}">We received your message</h2>
    <p style="${pStyle}">Hi ${displayName},</p>
    <p style="${pStyle}">Thank you for getting in touch. We have received your message and will get back to you as soon as we can.</p>
    <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0;">If your matter is urgent, you can also reach us at the contact details on our website.</p>
  `
  return emailLayout({
    title: 'We received your message – Grovio',
    headerTitle: 'Message received',
    content,
    footerTagline: 'The Grovio Team',
  })
}
