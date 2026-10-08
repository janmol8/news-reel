import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import React from 'react'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <React.StrictMode>
      <ThemeProvider attribute="class" defaultTheme="dark">
        {/* Honour the OS "reduce motion" setting for every animation in the app */}
        <MotionConfig reducedMotion="user">
          <Component {...pageProps} />
        </MotionConfig>
      </ThemeProvider>
    </React.StrictMode>
  )
}
