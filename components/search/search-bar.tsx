"use client"

import type React from "react"

import { Search } from "lucide-react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleSearch: (e: React.FormEvent) => void
}

export default function SearchBar({ searchQuery, setSearchQuery, handleSearch }: SearchBarProps) {
  return (
    <motion.form
      onSubmit={handleSearch}
      className="relative w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="relative flex items-center">
        <Input
          type="text"
          placeholder="Enter your query..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-14 w-full rounded-full border-2 border-gray-800 bg-black pl-5 pr-32 font-mono text-lg text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] focus-visible:border-white focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          type="submit"
          className="absolute right-2 h-10 rounded-full bg-white px-6 font-mono text-sm font-bold text-black hover:bg-gray-200"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>SEARCH</span>
          </span>
          <span className="absolute inset-0 z-0 rounded-full blur-[4px] opacity-70 bg-white"></span>
        </Button>
      </div>
    </motion.form>
  )
}
