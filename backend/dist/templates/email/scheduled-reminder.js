"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledReminderHtml = scheduledReminderHtml;
const shared_1 = require("./shared");
function scheduledReminderHtml(params) {
    const { userName, scheduledDate, bundleTitle, shopUrl } = params;
    const dateStr = new Date(scheduledDate).toLocaleDateString();
    const greeting = userName ? `Hi ${userName},` : 'Hi there,';
    const content = `
    <h2 style="${shared_1.h2Style}">Your scheduled order is tomorrow</h2>
    <p style="${shared_1.pStyle}">${greeting}</p>
    <p style="${shared_1.pStyle}">This is a reminder that your scheduled order for <strong>${bundleTitle}</strong> is due on <strong>${dateStr}</strong>.</p>
    <p style="${shared_1.pStyle}">Complete your payment so we can deliver on time:</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${shopUrl}/shop" style="${shared_1.primaryButtonStyle}">Go to shop</a>
    </div>
    <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0;">If you already placed this order, you can ignore this email.</p>
  `;
    return (0, shared_1.emailLayout)({
        title: `Reminder: Scheduled order – ${bundleTitle}`,
        headerTitle: 'Scheduled order reminder',
        content,
        footerTagline: 'The Grovio Team',
    });
}
