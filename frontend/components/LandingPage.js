'use client'

import { useEffect, useState } from 'react'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import AuroraBackground from './landing/AuroraBackground'
import { Nav, Hero, Chains, Agent, Defense, Console, Footer } from './landing/sections'
import './landing/landing.css'

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--lp4-font-display',
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--lp4-font-mono',
  display: 'swap',
})

export default function LandingPage({ onGetStarted, onGuestMode }) {
  const [loaded, setLoaded] = useState(false)

  // trigger the hero word-mask reveal shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`lp4 ${loaded ? 'loaded' : ''} ${displayFont.variable} ${monoFont.variable}`}>
      <AuroraBackground />
      <div className="lp4-content">
        <Nav onGetStarted={onGetStarted} />
        <main>
          <Hero onGetStarted={onGetStarted} onGuestMode={onGuestMode} />
          <Chains />
          <Agent />
          <Defense />
          <Console onGetStarted={onGetStarted} />
        </main>
        <Footer />
      </div>
    </div>
  )
}
