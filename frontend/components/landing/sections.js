'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, Bot, Check, Ghost, Github, KeyRound, Linkedin, Mail, User, Wallet } from 'lucide-react'
import { SignInButton, useUser } from '@clerk/nextjs'
import { priceAPI } from '@/lib/api'
import Reveal, { useInView } from './Reveal'
import Spark from './Spark'

const fmtUSD = (n, dp = 2) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

// Primary CTA: signed-in users go straight to wallet setup, signed-out users
// get the Clerk modal (mirrors the previous landing page behaviour).
function LaunchCTA({ onGetStarted, className = 'btn4 primary', style, children }) {
  const { isSignedIn } = useUser()
  if (isSignedIn) {
    return (
      <button type="button" className={className} style={style} onClick={onGetStarted}>
        {children}
      </button>
    )
  }
  return (
    <SignInButton mode="modal" forceRedirectUrl="/">
      <button type="button" className={className} style={style}>{children}</button>
    </SignInButton>
  )
}

// ---------- nav ----------
export function Nav({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav className={`nav4 ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 28, height: 68 }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--lp4-ink)', marginRight: 'auto' }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, border: '1.5px solid var(--lp4-accent)', display: 'grid', placeItems: 'center', color: 'var(--lp4-accent)', boxShadow: '0 0 18px -4px var(--lp4-accent)' }}>
            <Wallet size={14} strokeWidth={2.4} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Walletrix</span>
        </a>
        <div style={{ display: 'flex', gap: 26 }} className="navlinks">
          <a className="nlink" href="#chains">Chains</a>
          <a className="nlink" href="#agent">Agent</a>
          <a className="nlink" href="#defense">Security</a>
          <a className="nlink" href="#console">Console</a>
        </div>
        <LaunchCTA onGetStarted={onGetStarted} style={{ padding: '10px 22px', fontSize: 14.5 }}>
          Launch app
        </LaunchCTA>
      </div>
    </nav>
  )
}

// ---------- hero ----------
function HeroWords({ text, startDelay = 0, grad = false }) {
  const words = text.split(' ')
  return words.map((word, i) => (
    <span key={i}>
      <span className="hw">
        <span className={grad ? 'grad-ink' : ''} style={{ transitionDelay: `${startDelay + i * 95}ms` }}>{word}</span>
      </span>
      {i < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

export function Hero({ onGetStarted, onGuestMode }) {
  return (
    <header id="top" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '120px 0 60px' }}>
      <div className="wrap" style={{ textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 30 }}>
        <Reveal delay={120}>
          <div className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap', border: '1px solid var(--lp4-line)', borderRadius: 999, padding: '8px 16px', background: 'rgba(8,11,20,0.4)', backdropFilter: 'blur(6px)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lp4-green)', boxShadow: '0 0 10px var(--lp4-green)', animation: 'lp4PulseDot 2.4s ease-in-out infinite' }}></span>
            ETH · BTC · SOL — one console
          </div>
        </Reveal>
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <h1 style={{ fontSize: 'clamp(58px, 10.5vw, 138px)', lineHeight: 0.96, fontWeight: 700, letterSpacing: '-0.045em' }}>
            <HeroWords text="Crypto," startDelay={220} />
            <span style={{ color: 'var(--lp4-dim)' }}> </span>
            <HeroWords text="minus" startDelay={330} />
            <br />
            <HeroWords text="the noise." startDelay={520} grad />
          </h1>
          <span className="hl-rule"></span>
        </div>
        <Reveal delay={760}>
          <p className="sub" style={{ margin: '6px auto 0', textAlign: 'center' }}>
            One wallet for Ethereum, Bitcoin and Solana — with an AI agent in your
            Telegram that drafts the transfer, asks once, and executes.
          </p>
        </Reveal>
        <Reveal delay={880}>
          <div style={{ display: 'grid', gap: 18, justifyItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <LaunchCTA onGetStarted={onGetStarted}>
                Launch app <ArrowUpRight size={17} strokeWidth={2.4} />
              </LaunchCTA>
              <a className="btn4 ghost" href="#chains">See it move</a>
            </div>
            {onGuestMode ? (
              <button type="button" className="guest-link" onClick={onGuestMode}>
                or continue as guest
              </button>
            ) : null}
          </div>
        </Reveal>
      </div>
    </header>
  )
}

// ---------- section header ----------
function SecHead({ index, label, title, sub }) {
  return (
    <div style={{ display: 'grid', gap: 22, marginBottom: 64 }}>
      <Reveal><div className="lbl">{index} — {label}</div></Reveal>
      <Reveal delay={120}><h2>{title}</h2></Reveal>
      {sub ? <Reveal delay={240}><p className="sub" style={{ margin: 0 }}>{sub}</p></Reveal> : null}
    </div>
  )
}

// ---------- 01 chains ----------
// Static fallbacks shown until (or in case) the live price fetch resolves.
const CHAIN_ROWS = [
  { id: 'ethereum', sym: 'Ξ', name: 'Ethereum', net: 'mainnet', color: '#4d84ff', price: 3418.22, chg: 2.41 },
  { id: 'bitcoin', sym: '₿', name: 'Bitcoin', net: 'mainnet', color: '#f97316', price: 67220.5, chg: -1.18 },
  { id: 'solana', sym: '◎', name: 'Solana', net: 'mainnet', color: '#a855f7', price: 168.42, chg: 6.83 },
]

function useLivePrices() {
  const [live, setLive] = useState(null)
  useEffect(() => {
    let alive = true
    priceAPI
      .getMultiplePrices(['ethereum', 'bitcoin', 'solana'], 'usd')
      .then((response) => {
        if (!alive || !response?.success || !Array.isArray(response.prices)) return
        const byId = {}
        response.prices.forEach((coin) => {
          if (coin?.coin && Number.isFinite(Number(coin.price))) {
            byId[coin.coin] = { price: Number(coin.price), chg: Number(coin.change24h ?? 0) }
          }
        })
        if (Object.keys(byId).length) setLive(byId)
      })
      .catch(() => { /* static fallback stays in place */ })
    return () => { alive = false }
  }, [])
  return live
}

function ChainRow({ c, delay, live }) {
  const price = live?.price ?? c.price
  const chg = live?.chg ?? c.chg
  const up = chg >= 0
  return (
    <Reveal delay={delay}>
      <div className="lrow" style={{ gridTemplateColumns: 'auto 1fr auto auto auto', gap: 26 }}>
        <span style={{ width: 52, height: 52, borderRadius: '50%', border: `1.5px solid ${c.color}55`, color: c.color, display: 'grid', placeItems: 'center', fontSize: 24, textShadow: `0 0 16px ${c.color}` }}>{c.sym}</span>
        <div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{c.name}</div>
          <div className="lbl" style={{ marginTop: 5, fontSize: 11 }}>{c.net}</div>
        </div>
        <span className="hide-sm"><Spark color={c.color} width={130} height={38} /></span>
        <div style={{ textAlign: 'right', fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 18, minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(price)}</div>
        <div style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 13, color: up ? 'var(--lp4-green)' : 'var(--lp4-red)', minWidth: 64, textAlign: 'right' }}>{up ? '+' : ''}{chg.toFixed(2)}%</div>
      </div>
    </Reveal>
  )
}

export function Chains() {
  const live = useLivePrices()
  return (
    <section id="chains" className="sec">
      <div className="wrap">
        <SecHead
          index="01"
          label="Chains"
          title="Three chains. One surface."
          sub="No tab-hopping, no juggling extensions. Your Ethereum, Bitcoin and Solana balances live on the same quiet screen — with live prices and token views."
        />
        <div>
          {CHAIN_ROWS.map((c, i) => (
            <ChainRow key={c.id} c={c} delay={i * 120} live={live?.[c.id]} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- 02 agent ----------
// Mirrors the real Telegram flow: draft → explicit YES confirmation → execution.
const CHAT = [
  { from: 'you', text: 'send 0.05 eth to alice' },
  { from: 'bot', text: 'Draft ready — 0.05 ETH → alice (0x91a…3fE2). Reply YES within 2 minutes to confirm.' },
  { from: 'you', text: 'YES' },
  { from: 'bot', receipt: true, text: 'Confirmed — 0.05 ETH sent · tx 0x7be4…c21a' },
]

export function Agent() {
  const [ref, seen] = useInView(0.4)
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!seen) return undefined
    const delays = [400, 1700, 3100, 4400]
    const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d))
    return () => timers.forEach(clearTimeout)
  }, [seen])
  const typing = seen && step >= 1 && step < CHAT.length

  return (
    <section id="agent" className="sec">
      <div className="wrap agent-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 70, alignItems: 'center' }}>
        <div>
          <SecHead
            index="02"
            label="Agent"
            title="Type it. It's done."
            sub="A Walletrix agent lives in your Telegram. Check balances, send to saved recipients, track transactions — in plain words. Nothing moves without your explicit YES."
          />
          <Reveal delay={300}>
            <div className="lbl" style={{ fontSize: 11.5, lineHeight: 2.2 }}>balances · transfers · saved recipients · tx status · stealth receives</div>
          </Reveal>
        </div>
        <Reveal delay={150}>
          <div ref={ref} className="mock4" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--lp4-line)' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'color-mix(in oklab, var(--lp4-accent) 22%, transparent)', color: 'var(--lp4-accent)', display: 'grid', placeItems: 'center' }}>
                <Bot size={17} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Walletrix Agent</div>
                <div style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 11, color: 'var(--lp4-green)' }}>online</div>
              </div>
            </div>
            <div style={{ padding: '26px 22px 30px', display: 'grid', gap: 14, minHeight: 260, alignContent: 'start' }}>
              {CHAT.slice(0, step).map((m, i) => (
                <div key={i} className="msg4 on" style={{ justifySelf: m.from === 'you' ? 'end' : 'start', maxWidth: '85%' }}>
                  {m.receipt ? (
                    <div style={{ border: '1px solid color-mix(in oklab, var(--lp4-green) 40%, transparent)', borderRadius: 14, padding: '13px 16px', fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 12.5, color: 'var(--lp4-green)', display: 'flex', gap: 10, alignItems: 'center', background: 'color-mix(in oklab, var(--lp4-green) 7%, transparent)' }}>
                      <Check size={15} strokeWidth={2.6} /> {m.text}
                    </div>
                  ) : (
                    <div style={{ borderRadius: 14, padding: '12px 16px', fontSize: 14.5, lineHeight: 1.5, background: m.from === 'you' ? 'var(--lp4-accent)' : 'rgba(150,175,225,0.09)', color: m.from === 'you' ? '#04050a' : 'var(--lp4-ink)', fontWeight: m.from === 'you' ? 500 : 400 }}>{m.text}</div>
                  )}
                </div>
              ))}
              {typing ? (
                <div style={{ display: 'flex', gap: 5, padding: '12px 16px', borderRadius: 14, background: 'rgba(150,175,225,0.09)', width: 'max-content' }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lp4-dim)', animation: `lp4DotPulse 1.1s ${i * 0.18}s ease-in-out infinite` }}></span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------- 03 defense ----------
// The real Walletrix security model, not marketing fiction.
const DEFENSE = [
  {
    Icon: Ghost,
    title: 'Stealth receives',
    text: 'A fresh one-time address for every receive, issued from Telegram or the dashboard. Payments never trace back to your main wallet.',
  },
  {
    Icon: Bot,
    title: 'Isolated agent wallet',
    text: 'The Telegram agent spends only from its own dedicated wallet, funded by you. Your main keys never touch the chat.',
  },
  {
    Icon: KeyRound,
    title: 'Encrypted at rest',
    text: 'Wallet keys are sealed with AES-256-GCM, derived from your password — encrypted before they ever reach a database.',
  },
]

export function Defense() {
  return (
    <section id="defense" className="sec">
      <div className="wrap">
        <SecHead
          index="03"
          label="Defense"
          title="Security that stays out of the way."
          sub="Everything is protected by default — nothing asks for your attention until it has to."
        />
        <div>
          {DEFENSE.map((d, i) => (
            <Reveal key={d.title} delay={i * 120}>
              <div className="lrow" style={{ gridTemplateColumns: 'auto minmax(140px, 240px) 1fr', gap: 30 }}>
                <span style={{ color: 'var(--lp4-accent)', opacity: 0.9 }}><d.Icon size={24} strokeWidth={1.8} /></span>
                <div style={{ fontSize: 21, fontWeight: 600 }}>{d.title}</div>
                <p className="sub" style={{ margin: 0, fontSize: 16.5 }}>{d.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- 04 console preview ----------
// smooth random-walk number: drifts toward a new target every ~1.6s
function useLiveNumber(base, vol = 0.0012) {
  const [shown, setShown] = useState(base)
  useEffect(() => {
    let alive = true
    let target = base
    let current = base
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const drift = setInterval(() => {
      target = target * (1 + (Math.random() - 0.5) * 2 * vol)
    }, 1600)
    let stepTimer = null
    const step = () => {
      if (!alive) return
      current += (target - current) * 0.18
      setShown(current)
      stepTimer = setTimeout(step, 110)
    }
    step()
    return () => {
      alive = false
      clearInterval(drift)
      if (stepTimer) clearTimeout(stepTimer)
    }
  }, [base, vol])
  return shown
}

const ACTIVITY = [
  { dir: 'in', label: 'Received', sym: 'ETH', amt: '2.50', who: '0x91a…3fE2', time: '4m' },
  { dir: 'bot', label: 'Agent transfer', sym: 'ETH', amt: '0.05', who: '→ alice', time: '22m' },
  { dir: 'in', label: 'Stealth claim', sym: 'ETH', amt: '0.80', who: 'one-time address', time: '2h' },
  { dir: 'out', label: 'Sent', sym: 'SOL', amt: '12.00', who: '7Np4…T4K2', time: '1d' },
]

export function Console({ onGetStarted }) {
  const total = useLiveNumber(148205.16, 0.0007)
  const delta = useLiveNumber(3420.55, 0.004)
  return (
    <section id="console" className="sec">
      <div className="wrap">
        <SecHead
          index="04"
          label="Console"
          title="Your portfolio, breathing."
          sub="Live balances, live prices, live agent activity — the dashboard updates itself so you don't have to."
        />
        <Reveal delay={150}>
          <div className="mock4" style={{ padding: 'clamp(22px, 4vw, 44px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
              <span className="lbl" style={{ fontSize: 11 }}>Main vault</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lp4-green)', boxShadow: '0 0 8px var(--lp4-green)', animation: 'lp4PulseDot 2.4s ease-in-out infinite' }}></span>
              <span style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 11, color: 'var(--lp4-green)', letterSpacing: '0.14em' }}>LIVE</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 12, color: 'var(--lp4-green)' }}>+{fmtUSD(delta)} today</span>
            </div>
            <div style={{ fontSize: 'clamp(44px, 6.5vw, 76px)', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtUSD(total)}</div>
            <div style={{ margin: '34px 0 30px' }}>
              <Spark color="#67d1ef" width="auto" height={90} lineWidth={2} speed={500} />
            </div>
            <div style={{ borderTop: '1px solid var(--lp4-line)' }}>
              {ACTIVITY.map((a, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 18, alignItems: 'center', padding: '15px 4px', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--lp4-line)' : 'none' }}>
                    <span style={{ color: a.dir === 'in' ? 'var(--lp4-green)' : a.dir === 'bot' ? 'var(--lp4-accent)' : 'var(--lp4-dim)' }}>
                      {a.dir === 'in' ? <ArrowDown size={16} /> : a.dir === 'bot' ? <Bot size={16} /> : <ArrowUp size={16} />}
                    </span>
                    <span style={{ fontSize: 15 }}>{a.label} <span style={{ color: 'var(--lp4-dim)' }}>· {a.who}</span></span>
                    <span style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>{a.amt} {a.sym}</span>
                    <span style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 12, color: 'var(--lp4-dim)', minWidth: 34, textAlign: 'right' }}>{a.time}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={250}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 54 }}>
            <LaunchCTA onGetStarted={onGetStarted}>
              Open the console <ArrowUpRight size={17} strokeWidth={2.4} />
            </LaunchCTA>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------- footer ----------
const SOCIALS = [
  { Icon: Github, label: 'Walletrix repository', href: 'https://github.com/ayushns01/Walletrix' },
  { Icon: User, label: 'GitHub profile (@ayushns01)', href: 'https://github.com/ayushns01' },
  { Icon: Linkedin, label: 'LinkedIn — Ayush N', href: 'https://www.linkedin.com/in/ayush-n-a6a89a19a/' },
  { Icon: Mail, label: 'ayushnarayansharma@gmail.com', href: 'mailto:ayushnarayansharma@gmail.com' },
]

function SocialLink({ Icon, label, href }) {
  return (
    <a
      className="lp4-social"
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <Icon size={17} strokeWidth={1.9} />
    </a>
  )
}

export function Footer() {
  return (
    <footer style={{ paddingTop: '6rem', borderTop: '1px solid var(--lp4-line)', overflow: 'hidden' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', paddingBottom: 40 }}>
        <span className="lbl" style={{ marginRight: 'auto' }}>© 2026 Walletrix</span>
        <a className="nlink" href="#chains" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Chains</a>
        <a className="nlink" href="#agent" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Agent</a>
        <a className="nlink" href="#defense" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Security</a>
      </div>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingBottom: 56 }}>
        <span className="lbl" style={{ marginRight: 'auto', fontSize: 11 }}>Built by Ayush Narayan Sharma</span>
        {SOCIALS.map((s) => <SocialLink key={s.label} {...s} />)}
      </div>
      <Reveal>
        <div className="giant" style={{ textAlign: 'center', transform: 'translateY(12%)' }}>WALLETRIX</div>
      </Reveal>
    </footer>
  )
}
