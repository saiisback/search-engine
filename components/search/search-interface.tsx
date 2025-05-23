"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Bot,
  Notebook,
  FileSearch,
  BookOpen,
  FileText,
  Brain,
  SatelliteDish,
  Link
} from "lucide-react"

import SearchHeader from "./search-header"
import SearchBar from "./search-bar"
import SearchResults from "./search-results"
import { cn } from "@/lib/utils"
import FeatureToggle from "../feature-toggle"

export default function SearchInterface() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFeature, setActiveFeature] = useState("search")
  const [showResults, setShowResults] = useState(false)
  const [submittedQuery, setSubmittedQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSubmittedQuery(searchQuery.trim())
      setShowResults(true)
    }
  }

  

  const features = [
    { id: "search", icon: Search, label: "Search", link: "/" },
    { id: "code-search", icon: FileSearch, label: "Code Search", link: "/code-search" },
    { id: "ai-chat", icon: Bot, label: "AI Chat", link: "/ai-chat" },
    { id: "llm-notebook", icon: Notebook, label: "LLM Notebook", link: "/llm-notebook" },
    
    { id: "academic-search", icon: BookOpen, label: "PDF / Academic Search", link: "/academic-search" },
    { id: "document-chat", icon: FileText, label: "Document Chat", link: "/document-chat" },
    { id: "knowledge-graph", icon: Brain, label: "Knowledge Graph View", link: "/knowledge-graph" },
    { id: "web-monitor", icon: SatelliteDish, label: "Real-time Web Monitor", link: "/web-monitor" },
  ]

  return (
    <div className="w-full max-w-7xl px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "flex w-full flex-col items-center transition-all duration-500",
          showResults ? "justify-start" : "justify-center min-h-[90vh]",
        )}
      >
        
        <SearchHeader minimized={showResults} />

        <div className={cn("w-full max-w-3xl transition-all duration-500", showResults ? "mt-4" : "mt-12")}>
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} />

        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
            {features.map((feature) => (
              <FeatureToggle
                key={feature.id}
                feature={feature}
                isActive={activeFeature === feature.id}
                onClick={() => setActiveFeature(feature.id)}
              />
            ))}
          </div>
        

        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 w-full"
          >
            
            <SearchResults query={submittedQuery} feature={activeFeature} />
          </motion.div>
        )}
      </motion.div>
      <footer className="w-full border-t border-gray-800 pt-6 text-center text-xs text-gray-500 font-mono">
  <p className="opacity-60">
    {"//"} handcrafted with logic & caffeine — dedicated to M<br/>
    Made by <a href="saikarthikketha.tech"> <span className="underline text-white">Sai Karthik Ketha</span></a>
  </p>
</footer>
    </div>
  )
}