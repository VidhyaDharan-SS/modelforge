import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/providers/sidebar-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ML Pipeline Builder",
  description: "Build ML pipelines with drag-and-drop interface",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className + " min-h-screen overflow-hidden"}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <div className="flex flex-row w-full min-h-screen">
              {children}
            </div>
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
import './globals.css'