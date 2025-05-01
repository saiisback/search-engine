import type { Metadata } from 'next'
import './globals.css'

import { ThemeProvider } from 'next-themes'

export const metadata: Metadata = {
  title: 'Azizah',
  description: 'made by sai karthik',
  generator: 'sai karthik ketha',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="bg-black ">
        {children}

      </body>
    </html>
  )
}
