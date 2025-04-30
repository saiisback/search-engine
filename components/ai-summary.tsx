"use client"
import { useState, useEffect } from "react"
import { Loader, MessageSquare, Sparkles, AlertCircle } from "lucide-react"

interface AiSummaryProps {
  query: string
  onSummaryComplete?: () => void
  apiKeyIndex?: number
}

const API_KEYS = [
  "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",
  "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",
  "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",
  "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",
  "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",
  "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",
  "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"
]

export default function AiSummary({ query, onSummaryComplete, apiKeyIndex = 0 }: AiSummaryProps) {
  const [summary, setSummary] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentApiKeyIndex, setCurrentApiKeyIndex] = useState<number>(apiKeyIndex)

  const renderMarkdown = (text: string) => {
    // Simple markdown bold replacement
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>")
  }

  useEffect(() => {
    if (!query) return

    const fetchSummary = async (retry = 0) => {
      setLoading(true)
      setSummary("")
      setError(null)

      const apiKey = API_KEYS[retry % API_KEYS.length]

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [
              {
                role: "system",
                content: `
You are an intelligent knowledge-explainer AI that provides accurate, detailed, and structured educational summaries based on user search queries. The user input is always a search topic or keyword, and your role is to deliver factual, concise, and well-organized information about that topic — like a personal, intelligent Wikipedia.

Your response must follow these formatting and content rules strictly:
1. Start with a single bolded summary sentence using markdown syntax (**bold this**).
2. Then provide a total of 8 additional lines, each sentence giving key facts, context, or deeper explanation about the topic.
3. The writing should be professional, formal, and encyclopedic in tone — never speculative, casual, or vague.
4. Avoid any uncertainty phrases like “might,” “could be,” “possibly,” or “you may be looking for.”
5. Do not include lists, bullet points, headings, or follow-up questions.
6. Write in **plain Markdown**. All 9 lines should be informative sentences, separated by line breaks.
7. Avoid redundancy; each sentence must introduce a distinct aspect of the topic (definition, origin, use, variations, relevance, etc.).
                `.trim(),
              },
              {
                role: "user",
                content: `Interpret this search query: "${query}"`,
              },
            ],
            temperature: 0.5,
            max_tokens: 300,
            top_p: 0.9,
            stop: ["\n\n"],
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || "AI summary generation failed")
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error("No summary returned")

        setSummary(renderMarkdown(content.trim()))

        if (onSummaryComplete) onSummaryComplete()
      } catch (err: any) {
        console.error("AI Summary Error:", err.message)

        if (
          err.message.includes("rate limit") ||
          err.message.includes("authentication") ||
          err.message.includes("invalid")
        ) {
          if (retry + 1 < API_KEYS.length) {
            setCurrentApiKeyIndex((retry + 1) % API_KEYS.length)
            setTimeout(() => fetchSummary(retry + 1), 800)
          } else {
            setError("All API keys exhausted. Please try again later.")
          }
        } else {
          setError(err.message || "Failed to generate AI summary")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [query])

  if (!query) return null

  return (
    <div className="bg-black border-b border-gray-800 mb-5 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-white" />
        <h3 className="text-m font-medium text-white">AI INTERPRETATION</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-white">
          <Loader size={14} className="animate-spin" />
          <p className="text-sm">Generating AI summary...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-2 text-white">
          <AlertCircle size={14} className="text-gray-500" />
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      ) : (
        <div className="bg-black rounded-lg p-3 my-2 border border-white">
          <div className="flex gap-3">
            <div className="mt-1">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div
              className="text-sm text-white leading-relaxed"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          </div>
        </div>
      )}
    </div>
  )
}