import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
