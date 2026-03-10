import { emailLayout, h2Style, pStyle, primaryButtonStyle } from './shared'

export function scheduledReminderHtml(params: {
  userName?: string
  scheduledDate: string
  bundleTitle: string
  shopUrl: string
}): string {
  const { userName, scheduledDate, bundleTitle, shopUrl } = params
  const dateStr = new Date(scheduledDate).toLocaleDateString()
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const content = `
    <h2 style="${h2Style}">Your scheduled order is tomorrow</h2>
    <p style="${pStyle}">${greeting}</p>
    <p style="${pStyle}">This is a reminder that your scheduled order for <strong>${bundleTitle}</strong> is due on <strong>${dateStr}</strong>.</p>
    <p style="${pStyle}">Complete your payment so we can deliver on time:</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${shopUrl}/shop" style="${primaryButtonStyle}">Go to shop</a>
    </div>
    <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0;">If you already placed this order, you can ignore this email.</p>
  `
  return emailLayout({
    title: `Reminder: Scheduled order – ${bundleTitle}`,
    headerTitle: 'Scheduled order reminder',
    content,
    footerTagline: 'The Grovio Team',
  })
}
