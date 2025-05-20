import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import AppHeader from "@/components/app-header"
import HeroBanner from "@/components/hero-banner"
import QuickActions from "@/components/quick-actions"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Absence Management Hub",
  description: "Manager view for tracking team absences",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="min-h-screen flex flex-col">
            <div className="sticky top-0 z-50">
              <AppHeader />
              <HeroBanner />
              <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-3 pb-3">
                  <QuickActions />
                </div>
              </div>
            </div>
            <main className="flex-1 pt-3">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
