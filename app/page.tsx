import SearchInterface from "@/components/search/search-interface"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  return (
    
      <main className="flex min-h-screen flex-col items-center bg-black text-white">
        <SearchInterface />
      </main>
    
  )
}
