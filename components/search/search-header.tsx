"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SearchHeaderProps {
  minimized?: boolean
}

export default function SearchHeader({ minimized = false }: SearchHeaderProps) {
  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-500",
        minimized ? "mb-2" : "mb-8",
      )}
    >
      <motion.h1
        layout
        className={cn(
          "font-mono font-bold tracking-widest text-white transition-all duration-500",
          minimized ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl",
        )}
      >
        <span className="relative">
          <span className="relative z-10">Azizah</span>
          <span className="absolute left-0 top-0 z-0 blur-[8px] opacity-70 text-white">Azizah</span>
        </span>
      </motion.h1>

      {!minimized && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="mt-2 font-mono text-sm text-gray-400 md:text-base"
        >
          Navigate the digital void with precision
        </motion.p>
      )}
    </motion.div>
  )
}
