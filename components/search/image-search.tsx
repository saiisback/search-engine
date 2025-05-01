"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Loader, Clock, Image as ImageIcon, Globe, X } from "lucide-react"

interface ImageSearchResultsProps {
  query: string
  searchEngine?: "google" | "bing"
  numResults?: number
}

interface ImageResult {
  id: string
  url: string
  thumbnail_url: string
  title: string
  source_url: string
  source_domain: string
  width?: number
  height?: number
  alt_text: string
  position: number
}

interface ImageSearchResponse {
  query: string
  results: ImageResult[]
  total_results: number
  execution_time: number
  error: string | null
}

export default function ImageSearchResults({ 
  query, 
  searchEngine = "google",
  numResults = 10
}: ImageSearchResultsProps) {
  const [results, setResults] = useState<ImageResult[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number>(0)
  const [totalResults, setTotalResults] = useState<number>(0)
  const [selectedEngine, setSelectedEngine] = useState<string>(searchEngine)
  const [enlargedImage, setEnlargedImage] = useState<ImageResult | null>(null)

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`http://localhost:10000/api/image-search/?query=${encodeURIComponent(query)}&search_engine=${selectedEngine}&num_results=${numResults}`)

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data: ImageSearchResponse = await res.json()
        console.log("Image Search API response:", data)

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
  }, [query, selectedEngine, numResults])

  const changeSearchEngine = (engine: string) => {
    setSelectedEngine(engine)
  }

  const openEnlargedView = (image: ImageResult) => {
    setEnlargedImage(image)
  }

  const closeEnlargedView = () => {
    setEnlargedImage(null)
  }

  return (
    <div className="w-full">
      {/* Search Options Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">

        <span className="flex items-center gap-1 text-gray-400 font-mono text-xs">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            Image Search Engine :
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
        {!loading && executionTime > 0 && (
          <div className="flex items-center gap-1 text-white font-mono text-xs">
            <Clock className="h-3 w-3" />
            <span>Image search time: {executionTime.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* Search Results Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-2">
        {loading ? (
          <h2 className="font-mono text-lg font-bold">
            SEARCHING IMAGES FOR <span className="text-white opacity-70">"{query}"</span>
          </h2>
        ) : (
          <h2 className="font-mono text-lg font-bold">
            IMAGE RESULTS FOR <span className="text-white opacity-70">"{query}"</span>
          </h2>
        )}
        <span className="rounded-full border border-gray-800 bg-black px-3 py-1 font-mono text-xs">
          {loading ? '...' : `${totalResults} images`}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader className="animate-spin h-6 w-6 mb-2" />
          <span className="font-mono text-sm">Fetching image results...</span>
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
          No image results found for <strong>"{query}"</strong>.
        </div>
      )}

      {/* Enlarged Image View */}
      {enlargedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-6xl max-h-[90vh] overflow-hidden">
            <button 
              onClick={closeEnlargedView}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={enlargedImage.url} 
              alt={enlargedImage.alt_text || enlargedImage.title} 
              className="max-h-[85vh] max-w-full object-contain"
              onError={(e) => {
                // Fallback to thumbnail if main image fails to load
                const target = e.target as HTMLImageElement;
                if (target.src !== enlargedImage.thumbnail_url) {
                  target.src = enlargedImage.thumbnail_url;
                }
              }}
            />
            <div className="mt-2 text-white font-mono text-sm bg-black bg-opacity-70 p-2 rounded">
              <p className="truncate">{enlargedImage.title}</p>
              {enlargedImage.source_url && (
                <a 
                  href={enlargedImage.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs flex items-center gap-1 mt-1 hover:text-blue-300"
                >
                  <span className="truncate">{enlargedImage.source_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-5">
        {results.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group relative overflow-hidden rounded-lg border border-gray-800 bg-black hover:border-gray-600 cursor-pointer"
            onClick={() => openEnlargedView(image)}
          >
            <div className="relative pt-[75%]"> {/* 4:3 aspect ratio */}
              <img 
                src={image.thumbnail_url} 
                alt={image.alt_text || image.title} 
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  // Hide the image if it fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              
              {/* Image info overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                <p className="font-mono text-xs text-white truncate">{image.title}</p>
                {image.source_domain && (
                  <div className="flex items-center gap-1 mt-1">
                    <Globe className="h-3 w-3 text-gray-400" />
                    <span className="font-mono text-[10px] text-gray-400 truncate">
                      {image.source_domain}
                    </span>
                  </div>
                )}
                {image.width && image.height && (
                  <span className="font-mono text-[10px] text-gray-500 mt-1">
                    {image.width} × {image.height}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}