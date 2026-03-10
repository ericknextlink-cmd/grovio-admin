import { emailLayout, h2Style, pStyle, boxStyle } from './shared'

export function contactToAdminHtml(params: { name: string; email: string; phone?: string; message: string }): string {
  const { name, email, phone, message } = params
  const phoneLine = phone ? `<p style="color: #64748b; font-size: 16px; margin: 0 0 15px 0;"><strong>Phone:</strong> ${phone}</p>` : ''
  const safeMessage = (message || '').replace(/</g, '&lt;')
  const content = `
    <h2 style="${h2Style}">New contact form submission</h2>
    <p style="${pStyle}"><strong>Name:</strong> ${name}</p>
    <p style="${pStyle}"><strong>Email:</strong> ${email}</p>
    ${phoneLine}
    <div style="${boxStyle}">
      <p style="color: #1e3a8a; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Message:</p>
      <p style="color: #64748b; font-size: 14px; white-space: pre-wrap; margin: 0;">${safeMessage}</p>
    </div>
  `
  return emailLayout({
    title: `Contact form: ${name}`,
    headerTitle: 'New contact submission',
    content,
    footerTagline: 'The Grovio Team',
  })
}
