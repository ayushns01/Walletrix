'use client'

import { useEffect, useRef } from 'react'

// Generative aurora background: drifting gradient blobs rendered to a low-res
// canvas and upscaled (free blur), plus flowing noise-wave lines and scroll
// parallax. Ported from the walletrix-landing demo (landing4-bg.jsx) and
// parameterised so the wallet shell can run a damped, cheaper variant.

const FALLBACK_ACCENT = '#67d1ef'

function readAccent() {
  if (typeof window === 'undefined') return FALLBACK_ACCENT
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--wx-accent')
    .trim()
  return /^#[0-9a-f]{6}$/i.test(value) ? value : FALLBACK_ACCENT
}

function hexToRgb(hex) {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h, s, l]
}

function hslToRgb([h, s, l]) {
  h = ((h % 1) + 1) % 1
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    t = ((t % 1) + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]
}

// shift the accent hue to build a harmonious blob palette
function paletteFrom(accentHex) {
  const hsl = rgbToHsl(hexToRgb(accentHex))
  const mk = (dh, ds, dl) => hslToRgb([
    hsl[0] + dh,
    Math.min(1, Math.max(0.3, hsl[1] + ds)),
    Math.min(0.62, Math.max(0.3, hsl[2] + dl)),
  ])
  return [
    mk(0, 0, 0),
    mk(0.10, 0, 0.04),
    mk(-0.12, -0.05, -0.02),
    mk(0.5, -0.2, -0.18),
  ]
}

// Blob definitions: relative position oscillators + size + alpha + parallax rate
const BLOBS = [
  { px: 0.22, py: 0.30, ax: 0.16, ay: 0.12, s1: 0.21, s2: 0.31, size: 0.62, alpha: 0.30, par: 0.10, ci: 0 },
  { px: 0.80, py: 0.22, ax: 0.13, ay: 0.16, s1: 0.27, s2: 0.19, size: 0.52, alpha: 0.24, par: 0.16, ci: 1 },
  { px: 0.55, py: 0.78, ax: 0.20, ay: 0.10, s1: 0.16, s2: 0.24, size: 0.70, alpha: 0.20, par: 0.05, ci: 2 },
  { px: 0.10, py: 0.85, ax: 0.10, ay: 0.14, s1: 0.23, s2: 0.15, size: 0.55, alpha: 0.26, par: 0.21, ci: 3 },
]

export default function AuroraBackground({
  motion = 3,
  alphaScale = 1,
  waves = true,
  className = '',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    const off = document.createElement('canvas')
    const octx = off.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const accent = readAccent()
    const colors = paletteFrom(accent)
    const accentRgb = hexToRgb(accent)

    let w = 0
    let h = 0
    let raf = 0
    let alive = true
    let t = Math.random() * 400 // random start phase so reloads differ subtly

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      off.width = Math.max(4, w >> 3)
      off.height = Math.max(4, h >> 3)
    }
    resize()
    window.addEventListener('resize', resize)

    function drawBlobs(scroll) {
      const ow = off.width
      const oh = off.height
      octx.globalCompositeOperation = 'source-over'
      octx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--wx-bg')
        .trim() || '#04050a'
      octx.fillRect(0, 0, ow, oh)
      octx.globalCompositeOperation = 'lighter'
      const base = Math.max(ow, oh)
      for (const b of BLOBS) {
        const alpha = b.alpha * alphaScale
        const cx = (b.px + b.ax * Math.sin(t * b.s1 + b.ci * 2.1)) * ow
        const cy = (b.py + b.ay * Math.cos(t * b.s2 + b.ci * 1.4)) * oh - (scroll * b.par * oh) / Math.max(1, h)
        const r = base * b.size * (1 + 0.08 * Math.sin(t * 0.4 + b.ci))
        const [cr, cg, cb] = colors[b.ci]
        const g = octx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`)
        g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${alpha * 0.32})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        octx.fillStyle = g
        octx.fillRect(0, 0, ow, oh)
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'low'
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(off, 0, 0, w, h)
    }

    function drawWaves(scroll) {
      const N = 16
      const amp = (8 + 14 * motion) * Math.min(1.4, h / 800)
      ctx.lineWidth = 1
      for (let i = 0; i < N; i++) {
        const yBase = ((i + 0.5) / N) * h
        const drift = scroll * (0.04 + (i % 5) * 0.012)
        const a = (0.022 + 0.02 * Math.abs(Math.sin(i * 1.7 + t * 0.5))) * alphaScale
        ctx.strokeStyle = `rgba(${accentRgb[0]},${accentRgb[1]},${accentRgb[2]},${a})`
        ctx.beginPath()
        for (let x = -20; x <= w + 20; x += 18) {
          const y = yBase
            + amp * Math.sin(x * 0.0034 + t * 1.1 + i * 0.65 + drift * 0.01)
            + amp * 0.55 * Math.sin(x * 0.0011 - t * 0.7 + i * 1.31)
            - drift
          if (x === -20) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    function frame() {
      if (!alive) return
      const scroll = window.scrollY || 0
      t += 0.006 * motion
      drawBlobs(scroll)
      if (waves) drawWaves(scroll)
      if (!reduced && document.visibilityState === 'visible') {
        raf = requestAnimationFrame(frame)
      }
    }
    frame()

    // Resume the loop when the tab comes back; while hidden the last frame stays.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !reduced && alive) {
        cancelAnimationFrame(raf)
        frame()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // reduced motion: keep a static frame but re-render on scroll (throttled)
    let scrollTick = null
    const onScroll = () => {
      if (scrollTick) return
      scrollTick = setTimeout(() => {
        scrollTick = null
        frame()
      }, 120)
    }
    if (reduced) window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      if (reduced) window.removeEventListener('scroll', onScroll)
      if (scrollTick) clearTimeout(scrollTick)
    }
  }, [motion, alphaScale, waves])

  return <canvas ref={canvasRef} className={`wx-aurora-canvas ${className}`.trim()} aria-hidden="true" />
}
