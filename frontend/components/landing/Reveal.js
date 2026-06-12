'use client'

import { useEffect, useRef, useState } from 'react'

// Scroll-reveal wrapper driven by IntersectionObserver.
export function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, seen]
}

export default function Reveal({ children, delay = 0, as: Tag = 'div', style = {}, className = '' }) {
  const [ref, seen] = useInView()
  return (
    <Tag ref={ref} className={`r4 ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  )
}
