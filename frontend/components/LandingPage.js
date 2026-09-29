'use client'

import { useEffect, useState } from 'react'
import AuroraBackground from './landing/AuroraBackground'
import { Nav, Hero, Chains, Agent, Defense, Console, Footer } from './landing/sections'
import './landing/landing.css'

export default function LandingPage({ onGetStarted, onGuestMode }) {
  const [loaded, setLoaded] = useState(false)

  // trigger the hero word-mask reveal shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`lp4 ${loaded ? 'loaded' : ''}`}>
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
