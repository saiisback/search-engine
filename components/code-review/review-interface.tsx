"use client"
import { useState } from 'react'
import React from 'react'
import {
  Search,
  Bot,
  Notebook,
  FileSearch,
  BookOpen,
  FileText,
  Brain,
  SatelliteDish,
  Link,
  Network
} from "lucide-react"
import SearchHeader from '../search/search-header'
import CodeBox from './code-box'
import Visualisation from './visualisation'
import FeatureToggle from "../feature-toggle"

function ReviewInterface() {
  const [activeFeature, setActiveFeature] = useState("code-search")
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [showVisualization, setShowVisualization] = useState(false)
  
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
  
  const handleCodeChange = (newCode: string, newLanguage: string) => {
    setCode(newCode)
    setLanguage(newLanguage)
  }
  
  const handleVisualizeClick = () => {
    setShowVisualization(true)
  }
  
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className='mt-10'>
        <SearchHeader />
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
      </div>
      
      <div className="mt-6">
        {showVisualization ? (
          <Visualisation 
            code={code} 
            language={language} 
            onBack={() => setShowVisualization(false)} 
          />
        ) : (
          <CodeBoxWithVisualization
            onCodeChange={handleCodeChange}
            onVisualizeClick={handleVisualizeClick}
          />
        )}
      </div>
    </div>
  )
}

// Extended CodeBox with Visualization Button
function CodeBoxWithVisualization({ onCodeChange, onVisualizeClick }: { 
  onCodeChange: (code: string, language: string) => void, 
  onVisualizeClick: () => void 
}) {
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")

  const handleCodeChange = (value: string) => {
    setCode(value)
    onCodeChange(value, selectedLanguage)
  }
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value)
    onCodeChange(code, e.target.value)
  }
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 font-mono">
      
      
      {/* Code editor */}
      <CodeBox 
        initialCode={code}
        language={selectedLanguage}
      />
      <div className="flex justify-between items-center mb-6">
      
      <div className="flex items-center gap-3">
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          className="appearance-none bg-black text-white border border-white px-4 py-2 pr-10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-white"
        >
          {/* Language options */}
        </select>
        
        <button
          onClick={onVisualizeClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-800/50 rounded-md text-sm font-medium text-blue-200 transition-colors"
          disabled={!code.trim()}
        >
          <Network size={16} /> Visualize Code
        </button>
      </div>
    </div>
    <footer className="w-full border-t border-gray-800/50 mt-10 pt-6 text-center text-xs text-gray-500 font-mono">
                    <p className="opacity-60">
                        {"//"} handcrafted with logic & caffeine — dedicated to M<br />
                        Made by <a href="https://saikarthikketha.tech" className="underline text-white hover:text-blue-400 transition-colors">Sai Karthik Ketha</a>
                    </p>
                </footer>
    </div>
  )
}

export default ReviewInterface
