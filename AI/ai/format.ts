// Convert **bold** markup from LLM responses to HTML-safe bold text
// Example: "Hello **John**" -> "Hello <strong>John</strong>"
export function formatAsteriskBold(input: string): string {
  if (!input) return input
  // Replace pairs of **...** with <strong>...</strong>
  // Avoid matching across newlines greedily
  return input.replace(/\*\*(.+?)\*\*/g, (_m, p1) => `<strong>${p1}</strong>`)
}


// Normalize AI text for UI rendering:
// - Convert **bold** (handled above)
// - Put any *...* segments on their own line (treat as bullet-ish)
// - Ensure "Total:" is on its own line and separated from items
// - Convert newlines to <br/> for HTML rendering in the widget
export function formatAiResponse(input: string): string {
  if (!input) return input

  // 1) Bold
  let text = formatAsteriskBold(input)

  // 2) Single-asterisk wrapped segments → newline bullets
  // Example: "* Rice Olonka: ₵45 *" → "\n• Rice Olonka: ₵45"
  text = text.replace(/\*(?:\s*)([^*]+?)(?:\s*)\*/g, (_m, inner) => `\n• ${inner.trim()}`)

  // 3) Ensure Total line is separated
  text = text.replace(/\n?\s*(Total\s*:\s*[^\n]+)/i, (_m, totalLine) => `\n\n${totalLine.trim()}\n`)

  // 4) Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n")

  // 5) Convert to HTML line breaks for the chat bubble
  return text.replace(/\n/g, "<br/>")
}


