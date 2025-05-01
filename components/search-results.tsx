"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Loader, Clock, Star, FileSearch, Globe, Calendar, Image as ImageIcon, Search as SearchIcon } from "lucide-react"
import AiSummary from "./ai-summary"
import ImageSearchResults from "./image-search"

interface SearchResultsProps {
  query: string
  feature?: string
  searchEngine?: "google" | "bing"
  numResults?: number
}

interface Result {
  id: string
  title: string
  snippet: string
  url: string
  source: string
  domain: string
  position: number
  features?: {
    [key: string]: any
  }
}

interface SearchResponse {
  query: string
  results: Result[]
  total_results: number
  execution_time: number
  error: string | null
}

export default function SearchResults({
  query,
  feature,
  searchEngine = "google",
  numResults = 10
}: SearchResultsProps) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number>(0)
  const [totalResults, setTotalResults] = useState<number>(0)
  const [selectedEngine, setSelectedEngine] = useState<string>(searchEngine)
  const [contentView, setContentView] = useState<{ url: string, content: string } | null>(null)
  const [loadingContent, setLoadingContent] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<"text" | "images">("text")

  useEffect(() => {
    if (!query) return;
    if (viewMode !== "text") return; // Only fetch if in text mode

    const fetchResults = async () => {
      setLoading(true)
      setError(null)

      try {
        // Use the correct endpoint path
        const res = await fetch(`http://https://azizah.onrender.com/api/search/?query=${encodeURIComponent(query)}&search_engine=${selectedEngine}&num_results=${numResults}`)

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data: SearchResponse = await res.json()
        console.log("Search API response:", data)

        // Handle the response format from our updated API
        if (data.results && Array.isArray(data.results)) {
          setResults(data.results)
          setTotalResults(data.total_results || data.results.length)
          setExecutionTime(data.execution_time || 0)
          if (data.error) setError(data.error)
        } else {
          throw new Error("Unexpected data format from API")
        }

      } catch (err: any) {
        console.error("Fetch error:", err)
        setError(err.message || "Something went wrong.")
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, selectedEngine, numResults, viewMode])

  const fetchPageContent = async (url: string) => {
    setLoadingContent(true)
    try {
      const res = await fetch(`http://https://azizah.onrender.com/api/content/?url=${encodeURIComponent(url)}`)

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      console.log("Content API response:", data)

      if (data.content) {
        setContentView({
          url: url,
          content: data.content.content || "No content extracted"
        })
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (err: any) {
      console.error("Error fetching content:", err)
      alert(`Failed to fetch page content: ${err.message}`)
    } finally {
      setLoadingContent(false)
    }
  }

  const closeContentView = () => {
    setContentView(null)
  }

  const changeSearchEngine = (engine: string) => {
    setSelectedEngine(engine)
  }

  const toggleViewMode = (mode: "text" | "images") => {
    setViewMode(mode)
  }

  // Function to get a clean, readable domain
  const formatDomain = (domain: string) => {
    return domain.replace('www.', '')
  }

  // Function to highlight featured results
  const isFeatureResult = (result: Result) => {
    return result.source?.includes('featured') || result.position < 0
  }

  return (
    <div className="w-full">
      {/* Search Options Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          {/* View Mode Selector */}
          <div className="flex gap-2">
            <button
              className={`rounded-full px-3 py-1 font-mono text-xs transition-colors flex items-center gap-1 ${viewMode === 'text' ? 'bg-black-600 text-white border-white border-2' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => toggleViewMode('text')}
            >
              <SearchIcon className="h-3 w-3" />
              Text
            </button>
            <button
              className={`rounded-full px-3 py-1 font-mono text-xs transition-colors flex items-center gap-1 ${viewMode === 'images' ? 'bg-black-600 text-white border-white border-2' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => toggleViewMode('images')}
            >
              <ImageIcon className="h-3 w-3" />
              Images
            </button>
          </div>

          {/* Search Engine Selector */}
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-gray-400 font-mono text-xs">
              <Globe className="h-4 w-4 text-gray-400" />
              Text Search Engine :
            </span>
            <button
              className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${selectedEngine === 'google' ? 'bg-black-600 text-white border-white border-2' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => changeSearchEngine('google')}
            >
              Google
            </button>
            <button
              className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${selectedEngine === 'bing' ? 'bg-black-600 text-white border-white border-2' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => changeSearchEngine('bing')}
            >
              Bing
            </button>
          </div>
        </div>

        {!loading && executionTime > 0 && (
          <div className="flex items-center gap-1 text-white font-mono text-xs">
            <Clock className="h-3 w-3" />
            <span>Text search time: {executionTime.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Switch between text and image search results */}
      {viewMode === "images" ? (
        <ImageSearchResults
          query={query}
          searchEngine={selectedEngine as "google" | "bing"}
          numResults={numResults}
        />
      ) : (
        <>
          {/* Search Results Header */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-2">
            {loading ? (
              <h2 className="font-mono text-lg font-bold">
                SEARCHING <span className="text-white opacity-70">"{query}"</span>
              </h2>
            ) : (
              <h2 className="font-mono text-lg font-bold">
                RESULTS FOR <span className="text-white opacity-70">"{query}"</span>
              </h2>
            )}
            <span className="rounded-full border border-gray-800 bg-black px-3 py-1 font-mono text-xs">
              {loading ? '...' : `${totalResults} results`}
            </span>
          </div>

          {AiSummary && (
            <div className="mt-4">
              <AiSummary query={query} onSummaryComplete={() => setContentView(null)} />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader className="animate-spin h-6 w-6 mb-2" />
              <span className="font-mono text-sm">Fetching search results...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center text-red-500 font-mono text-sm py-4">
              {error}
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && results.length === 0 && (
            <div className="text-center text-gray-500 font-mono text-sm py-4">
              No results found for <strong>"{query}"</strong>.
            </div>
          )}

          {/* Content View Overlay */}
          {contentView && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
              <div className="bg-black border-white border-2 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="border-b border-gray-700 p-4 flex justify-between items-center">
                  <h3 className="font-mono font-bold truncate">{contentView.url}</h3>
                  <button
                    onClick={closeContentView}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                  {loadingContent ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader className="animate-spin h-6 w-6" />
                    </div>
                  ) : (
                    contentView.content
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Results Grid */}
          <div className="grid gap-4">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`group relative overflow-hidden rounded-lg border p-4 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${isFeatureResult(result)
                  ? 'border-blue-900 bg-black/70 hover:border-blue-700'
                  : 'border-gray-800 bg-black hover:border-gray-600'
                  }`}
              >
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white opacity-[0.02] blur-3xl transition-all duration-500 group-hover:opacity-[0.04]" />

                {/* Result Source Badge */}
                {result.source && (
                  <div className="mb-2 flex items-center">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${result.source.includes('featured')
                      ? 'bg-blue-900/50 text-blue-300'
                      : result.source === 'google'
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-gray-800 text-gray-400'
                      }`}>
                      {result.source}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className="font-mono text-lg font-bold text-white">{result.title}</h3>

                {/* Domain and Features */}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {result.domain && (
                    <span className="flex items-center gap-1 font-mono text-xs text-gray-500">
                      <Globe className="h-3 w-3" />
                      {formatDomain(result.domain)}
                    </span>
                  )}

                  {/* Stars if available */}
                  {result.features?.stars && (
                    <span className="flex items-center gap-1 font-mono text-xs text-yellow-500">
                      <Star className="h-3 w-3" />
                      {result.features.stars}
                    </span>
                  )}

                  {/* Date if available */}
                  {result.features?.date && (
                    <span className="flex items-center gap-1 font-mono text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {result.features.date}
                    </span>
                  )}
                </div>

                {/* Snippet */}
                <p className="mt-2 font-mono text-sm text-gray-400">{result.snippet}</p>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-gray-500 transition-colors hover:text-white"
                  >
                    <span className="truncate max-w-[300px]">{result.url}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    onClick={() => fetchPageContent(result.url)}
                    className="flex items-center gap-1 rounded px-2 py-1 font-mono text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {loadingContent && contentView?.url === result.url ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <FileSearch size={14} />
                        <span>Scraped Content</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}