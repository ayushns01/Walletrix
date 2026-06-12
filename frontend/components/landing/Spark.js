'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from './Reveal'

// Animated sparkline on a ref-driven canvas (no React churn per frame).
// width="auto" measures the parent container and re-renders on resize.
export default function Spark({ color = '#67d1ef', width = 120, height = 36, lineWidth = 1.5, glow = true, speed = 420 }) {
  const canvasRef = useRef(null)
  const holderRef = useRef(null)
  const [inViewRef, seen] = useInView()
  const [measured, setMeasured] = useState(typeof width === 'number' ? width : 0)
  const auto = width === 'auto'

  useEffect(() => {
    if (!auto) {
      setMeasured(width)
      return undefined
    }
    const el = holderRef.current
    if (!el) return undefined
    const measure = () => setMeasured(Math.max(40, el.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [auto, width])

  useEffect(() => {
    if (!seen || !measured) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const w = measured
    const h = height
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const N = 42
    let v = 0.5
    const data = Array.from({ length: N }, () => (v = Math.min(0.92, Math.max(0.08, v + (Math.random() - 0.5) * 0.16))))
    let alive = true
    let progress = 0
    let timer = null
    let raf = 0

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const upto = Math.max(2, Math.floor(N * Math.min(1, progress)))
      ctx.beginPath()
      for (let i = 0; i < upto; i++) {
        const x = (i / (N - 1)) * w
        const y = h - data[i] * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      if (glow) {
        ctx.shadowColor = color
        ctx.shadowBlur = 7
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // draw-in animation, then live ticking
    const drawIn = () => {
      if (!alive) return
      progress += reduced ? 1 : 0.06
      draw()
      if (progress < 1) raf = requestAnimationFrame(drawIn)
      else if (!reduced) {
        timer = setInterval(() => {
          if (!alive) return
          data.shift()
          data.push(Math.min(0.92, Math.max(0.08, data[N - 2] + (Math.random() - 0.5) * 0.16)))
          draw()
        }, speed)
      }
    }
    drawIn()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      if (timer) clearInterval(timer)
    }
  }, [seen, measured, color, height, lineWidth, glow, speed])

  const holderStyle = auto
    ? { display: 'block', width: '100%', height }
    : { display: 'inline-block', width: measured || width, height }

  return (
    <span
      ref={(el) => {
        holderRef.current = el
        inViewRef.current = el
      }}
      style={holderStyle}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />
    </span>
  )
}
