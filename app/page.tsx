import SearchInterface from "@/components/search-interface"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  return (
    <ThemeProvider defaultTheme="dark" forcedTheme="dark">
      <main className="flex min-h-screen flex-col items-center bg-black text-white">
        <SearchInterface />
      </main>
    </ThemeProvider>
  )
}
