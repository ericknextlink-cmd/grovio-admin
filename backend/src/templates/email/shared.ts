/**
 * Shared layout for Grovio email templates.
 * Brand: Primary Orange #D35F0E, Navy #1e3a8a, Light Gray #f8fafc, Dark Gray #64748b.
 * Responsive: viewport meta, max-width 600px, fluid layout.
 * All templates that use emailLayout() get the Grovio logo in the header.
 */
export const GROVIO_LOGO_URL = 'https://grovio-gamma.vercel.app/logo.png'

export function emailLayout(params: {
  title: string
  headerTitle: string
  content: string
  footerTagline?: string
}): string {
  const { title, headerTitle, content, footerTagline = 'The Grovio Team' } = params
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header: Grovio logo + title (used by all templates) -->
    <div style="background: linear-gradient(135deg, #D35F0E 0%, #b84d0a 100%); padding: 30px; text-align: center;">
      <img src="${GROVIO_LOGO_URL}" alt="Grovio" style="height: 50px; margin-bottom: 15px; max-width: 100%; display: block; margin-left: auto; margin-right: auto;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${headerTitle}</h1>
    </div>
    <div style="padding: 40px 30px;">
      ${content}
    </div>
    <div style="background-color: #1e3a8a; color: white; padding: 25px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Happy Shopping!</p>
      <p style="margin: 0; font-size: 14px; opacity: 0.8;">${footerTagline}</p>
    </div>
  </div>
</body>
</html>`
}

/** Content paragraph - dark gray text. */
export const pStyle = 'color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;'
/** Content h2 - navy. */
export const h2Style = 'color: #1e3a8a; font-size: 24px; margin: 0 0 20px 0; text-align: center;'
/** Primary CTA button - orange. */
export const primaryButtonStyle = 'background-color: #D35F0E; color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(211, 95, 14, 0.3);'
/** Info box - light gray bg. */
export const boxStyle = 'background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;'
/** Small / link text. */
export const smallStyle = 'color: #64748b; font-size: 14px; margin: 0;'
