
import { products } from "@/lib/products"
import { getBudgetBundle } from "./recommender"

type ChatOptions = {
  role?: string
  familySize?: number
  budget?: number
}

function extractBudgetFromText(message: string): number | undefined {
  const m = message.match(/(\d+[\.,]?\d*)/)
  return m ? parseFloat(m[1].replace(",", "")) : undefined
}

function buildContext(limit = 60): string {
  // Compact catalog context the LLM can read reliably
  const rows = products.slice(0, limit).map(
    (p) => `- id:${p.id} | ${p.name} | category:${p.category}/${p.subcategory ?? ""} | price:${p.price}`
  )
  return rows.join("\n")
}

export async function generateWithGroq(message: string, opts: ChatOptions = {}): Promise<string | null> {
  try {
    // Dynamic imports to avoid hard dependency during build if packages are not installed yet
    const { ChatGroq } = await import("@langchain/groq")
    const { ChatPromptTemplate } = await import("@langchain/core/prompts")
    const { StringOutputParser } = await import("@langchain/core/output_parsers")

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return null

    const role = opts.role ?? "user"
    const familySize = opts.familySize ?? 1
    const budget = opts.budget ?? extractBudgetFromText(message)

    const candidate = typeof budget === "number" ? getBudgetBundle({ role, familySize, budget }) : null

    const system = `You are a helpful grocery shopping assistant for Grovio. All prices are in cedis (₵).

Rules:
- For greetings (hi, hello, what do you do), respond warmly and explain your capabilities without giving recommendations
- Do not start non-greeting responses with phrases like "Welcome to Grovio" or similar salutations
- For shopping requests, use ONLY the provided catalog lines
- Prefer budget-friendly staples first (grains/flour/oil), then proteins, then produce
- If a budget is provided, ensure the total is under or equal to budget
- Format lists with proper line breaks, not single lines
- Do NOT include product IDs in responses
- Return a concise plan with bullet points of items and a total
- Wrap important headings in **double asterisks** so the client can boldly render them
 - When appropriate, include sensible quantities per item (e.g., more of cheap staples, single units for higher-priced items)

Catalog (id | name | category/subcategory | price):\n${buildContext(120)}
`

    const user = `Context: role=${role}; familySize=${familySize}; budget=₵${budget ?? "unknown"}
User message: ${message}
${candidate ? `Potential baseline basket (may revise): total=₵${candidate.total.toFixed(2)}; items=${candidate.items.map(i => `${i.product.name}x${i.quantity}`).join(", ")}` : ""}`

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", system],
      ["user", user],
    ])

    const model = new ChatGroq({ apiKey, model: "llama-3.3-70b-versatile", temperature: 0.3 })
    const chain = prompt.pipe(model).pipe(new StringOutputParser())
    const out = await chain.invoke({})
    return typeof out === "string" ? out : JSON.stringify(out)
  } catch {
    // Packages not available or runtime error
    return null
  }
}


