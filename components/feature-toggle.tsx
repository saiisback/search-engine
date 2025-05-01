"use client"

import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface Feature {
  id: string
  icon: LucideIcon
  label: string
  link: string
}

interface FeatureToggleProps {
  feature: Feature
  isActive: boolean
  onClick: () => void
}

export default function FeatureToggle({ feature, isActive, onClick }: FeatureToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
              "relative flex aspect-rectangle flex-col items-center justify-center rounded-lg border border-gray-800 bg-black p-2 transition-all duration-300",
              isActive ? "border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "hover:border-gray-600",
            )}
          >
            <Link className="flex items-center gap-2 justify-center" href={feature.link}>

              <feature.icon className="h-5 w-5 text-white" />
              <span className="text-[10px] font-mono tracking-tight leading-tight">
                {feature.label.split(" ")[0]}
              </span>
        
            </Link>
            

            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute bottom-0 h-0.5 w-8 bg-white"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
  side="bottom"
  className="bg-black border border-gray-700 font-mono text-xs text-gray-300"
>
  {feature.label}
</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}