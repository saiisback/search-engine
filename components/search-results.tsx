"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"

interface SearchResultsProps {
  query: string
  feature: string
}

interface Result {
  id: string
  title: string
  snippet: string
  url: string
}

export default function SearchResults({ query, feature }: SearchResultsProps) {
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    // Mock results - in a real app, this would be an API call
    const mockResults = [
      {
        id: "1",
        title: `${query} - Official Documentation`,
        snippet: `Comprehensive guide about ${query} and its applications in modern technology. Includes code examples and best practices.`,
        url: "https://example.com/docs",
      },
      {
        id: "2",
        title: `Understanding ${query} - A Deep Dive`,
        snippet: `An in-depth analysis of ${query} and how it relates to ${feature}. Explores advanced concepts and theoretical frameworks.`,
        url: "https://example.com/analysis",
      },
      {
        id: "3",
        title: `${query} Implementation Strategies`,
        snippet: `Learn how to implement ${query} in your projects. Step-by-step tutorials with practical examples and case studies.`,
        url: "https://example.com/implementation",
      },
      {
        id: "4",
        title: `The Future of ${query} Technology`,
        snippet: `Exploring upcoming trends and innovations in ${query}. Predictions from industry experts and research findings.`,
        url: "https://example.com/future",
      },
      {
        id: "5",
        title: `${query} vs. Alternative Approaches`,
        snippet: `Comparative analysis of ${query} against other methodologies. Pros, cons, and performance benchmarks.`,
        url: "https://example.com/comparison",
      },
    ]

    setResults(mockResults)
  }, [query, feature])

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-2">
        <h2 className="font-mono text-lg font-bold">
          RESULTS FOR <span className="text-white opacity-70">"{query}"</span>
        </h2>
        <span className="rounded-full border border-gray-800 bg-black px-3 py-1 font-mono text-xs">
          {results.length} results
        </span>
      </div>

      <div className="grid gap-4">
        {results.map((result, index) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-lg border border-gray-800 bg-black p-4 transition-all duration-300 hover:border-gray-600 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white opacity-[0.02] blur-3xl transition-all duration-500 group-hover:opacity-[0.04]" />

            <h3 className="font-mono text-lg font-bold text-white">{result.title}</h3>

            <p className="mt-2 font-mono text-sm text-gray-400">{result.snippet}</p>

            <div className="mt-3 flex items-center">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-gray-500 transition-colors hover:text-white"
              >
                <span className="truncate max-w-[300px]">{result.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
