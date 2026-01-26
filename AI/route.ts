/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { formatAsteriskBold, formatAiResponse } from "@/lib/ai/format"
import { getBudgetBundle, findProductsByQuery } from "@/lib/ai/recommender"
import { products } from "@/lib/products"
import { generateWithGroq } from "@/lib/ai/langchain"

// NOTE: Wire up Groq + LangChain later if needed online. For now, we deliver
// grounded, deterministic recommendations over our local catalog and emulate
// LLM-style responses, already formatted for bold via formatAsteriskBold.

export async function POST(req: NextRequest) {
  try {
    console.log("API route called")
    const body = await req.json()
    console.log("Request body:", body)
    const { message, role, familySize, budget } = body || {}

    if (!message || typeof message !== "string") {
      console.log("Invalid message:", message)
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    // Check for greetings and casual conversation first
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|how are you|what do you do|help|start)/i.test(message.trim())
    
    // Extract budget early so it's available for LLM call
    const amountMatch = message.match(/(\d+[\.,]?\d*)/)
    const extractedBudget = budget ?? (amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : undefined)
    
    let response = ""
    
    if (isGreeting) {
      response = "**Hello! I'm your Grovio shopping assistant.** 🛒\n\nI can help you with:\n• **Budget shopping lists** - Tell me your budget and household size\n• **Product recommendations** - Ask for specific items or categories\n• **Meal planning** - Get suggestions based on your needs\n\n**What would you like help with today?**"
    } else {

      if (/budget|cheap|afford|within/i.test(message) && extractedBudget) {
        const rec = getBudgetBundle({ role, familySize, budget: extractedBudget })
        const lines = rec.items.map((i) => `• ${i.product.name} x${i.quantity} - ₵${i.subtotal.toFixed(2)}`)
        response = `**Recommended Basket** (target ₵${extractedBudget.toFixed(2)}):\n\n${lines.join("\n")}\n\n**Total: ₵${rec.total.toFixed(2)}**\n\n**Reasoning:** ${rec.rationale}`
      } else if (/recommend|suggest|what.*buy|shopping list/i.test(message)) {
        const top = products.slice(0, 8)
        const lines = top.map((p) => `• ${p.name} - ₵${p.price.toFixed(2)}`)
        response = `**Starter Suggestions:**\n\n${lines.join("\n")}\n\n**Tell me your budget and household size for a tailored basket.**`
      } else {
        const related = findProductsByQuery(message).slice(0, 8)
        if (related.length) {
          const lines = related.map((p) => `• ${p.name} - ₵${p.price.toFixed(2)}`)
          response = `**Matching Items:**\n\n${lines.join("\n")}\n\n**Share a budget to generate a complete list.**`
        } else {
          response = "I can help with grocery recommendations. Tell me your budget and who you're shopping for (e.g., student, mother of 4)."
        }
      }
    }

    // Use generated response as primary, LLM as fallback only
    console.log("Generated response:", response)
    const llm = await generateWithGroq(message, { role, familySize, budget: extractedBudget })
    console.log("LLM response:", llm)
    // Use generated response first, only fallback to LLM if generated is empty
    const finalText = formatAiResponse(response || (llm ?? ""))
    console.log("Final text:", finalText)
    return NextResponse.json({ message: finalText })
  } catch (e: any) {
    console.error("API Error:", e)
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}


