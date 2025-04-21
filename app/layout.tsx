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
      {/* Removed overflow-hidden from body to allow proper scrolling */}
      <body className={inter.className + " min-h-screen"}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <div className="flex flex-row w-full min-h-screen items-stretch">
              {/* 
                Adjusted layout: the sidebar (provided in children or via SidebarProvider) 
                should have a fixed width while the main canvas takes the remaining space.
              */}
              {children}
            </div>
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}