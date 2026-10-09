'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, Bot, Check, Ghost, Github, KeyRound, Layers, Linkedin, Mail, Search, Send, User, Wallet } from 'lucide-react'
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
          <a className="nlink" href="#agent">Agent</a>
          <a className="nlink" href="#mcp">MCP tools</a>
          <a className="nlink" href="#defense">Delegation</a>
          <a className="nlink" href="#chains">Chains</a>
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
            Agentic AI wallet · MCP-native · On-chain
          </div>
        </Reveal>
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <h1 style={{ fontSize: 'clamp(58px, 10.5vw, 138px)', lineHeight: 0.96, fontWeight: 700, letterSpacing: '-0.045em' }}>
            <HeroWords text="Your" startDelay={220} />
            <span style={{ color: 'var(--lp4-dim)' }}> </span>
            <HeroWords text="wallet," startDelay={330} />
            <br />
            <HeroWords text="on autopilot." startDelay={520} grad />
          </h1>
          <span className="hl-rule"></span>
        </div>
        <Reveal delay={760}>
          <p className="sub" style={{ margin: '6px auto 0', textAlign: 'center' }}>
            Walletrix is an agentic AI wallet for web3. Message it on Telegram or WhatsApp
            and an AI agent runs multi-step on-chain workflows through MCP tools — swaps,
            cross-chain transfers, network abstraction — strictly within the authority you delegate.
          </p>
        </Reveal>
        <Reveal delay={880}>
          <div style={{ display: 'grid', gap: 18, justifyItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <LaunchCTA onGetStarted={onGetStarted}>
                Launch app <ArrowUpRight size={17} strokeWidth={2.4} />
              </LaunchCTA>
              <a className="btn4 ghost" href="#agent">Watch the agent work</a>
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
          index="04"
          label="Chains"
          title="Networks are the agent's problem."
          sub="Ethereum, Bitcoin and Solana, abstracted away. You never pick a network, a bridge or a gas token — the agent works out the chain, and every action settles on-chain. Live prices and token views on one quiet screen."
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
  { from: 'you', text: 'check my balance, then send 0.05 eth to alice' },
  { from: 'bot', text: 'Balance: 0.42 ETH. Draft ready — 0.05 ETH → alice (0x91a…3fE2). Reply YES within 2 minutes to confirm.' },
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
            index="01"
            label="Agent"
            title="Tell it the goal. It runs the steps."
            sub="Message your Walletrix agent in plain words. It chains the steps — checking balances, resolving recipients, drafting the transfer — and reports back with a receipt. Nothing moves without your explicit YES."
          />
          <Reveal delay={300}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="lbl" style={{ fontSize: 11.5, border: '1px solid var(--lp4-line-strong)', borderRadius: 999, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Send size={13} /> Telegram · live
              </span>
              <span className="lbl" style={{ fontSize: 11.5, border: '1px solid var(--lp4-line)', borderRadius: 999, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bot size={13} /> WhatsApp · soon
              </span>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="lbl" style={{ fontSize: 11.5, lineHeight: 2.2, marginTop: 18 }}>balances · transfers · saved recipients · tx status · stealth receives</div>
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
                <div style={{ fontFamily: 'var(--lp4-font-mono), monospace', fontSize: 11, color: 'var(--lp4-green)' }}>online · Telegram</div>
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

// ---------- 02 mcp tools ----------
// Mirrors backend/src/mcp + services/agent/toolDefinitions.js: the model can read and
// prepare; only the user's YES executes.
const mono = { fontFamily: 'var(--lp4-font-mono), monospace' }

const MCP_FLOW = [
  { Icon: User, title: 'You', text: 'Plain-language goal from Telegram or WhatsApp' },
  { Icon: Bot, title: 'AI agent', text: 'Plans the steps and picks MCP tools' },
  { Icon: Layers, title: 'Wallet MCP server', text: 'Typed tools that read and prepare' },
  { Icon: Check, title: 'Your YES', text: 'The only path to on-chain execution' },
]

const MCP_GROUPS = [
  {
    label: 'Read the chain',
    tools: [
      { name: 'get_balance', text: 'Live balance of the agent wallet.' },
      { name: 'get_tx_status', text: 'Follows a transaction hash until it lands.' },
      { name: 'get_recent_transfers', text: 'Recent on-chain transfer history.' },
      { name: 'get_last_transfer', text: 'The most recent transfer and its status.' },
    ],
  },
  {
    label: 'Prepare actions',
    tools: [
      { name: 'prepare_transfer', text: 'Stages a transfer to an address, ENS name or saved recipient. Never signs, never sends.' },
      { name: 'prepare_stealth_claim', text: 'Stages a sweep of a funded stealth address for confirmation.' },
    ],
  },
  {
    label: 'Recipients',
    tools: [
      { name: 'list_recipients', text: 'Resolves "send to Alice" against saved recipients.' },
      { name: 'save_recipient', text: 'Remembers a name for an address.' },
      { name: 'delete_recipient', text: 'Forgets a saved recipient.' },
    ],
  },
  {
    label: 'Stealth addresses',
    tools: [
      { name: 'issue_stealth_address', text: 'Issues a fresh one-time receive address.' },
      { name: 'list_stealth_addresses', text: 'Lists active, funded and claimed addresses.' },
      { name: 'preview_stealth_claim', text: 'Previews a claim before anything moves.' },
    ],
  },
]

export function McpTools() {
  return (
    <section id="mcp" className="sec">
      <div className="wrap">
        <SecHead
          index="02"
          label="MCP tools"
          title="Agentic by design. MCP-native."
          sub="Walletrix exposes your wallet to AI as a Model Context Protocol server. The agent calls typed tools, reads on-chain results and chains steps together — but it can only read and prepare. Execution sits behind your confirmation."
        />

        <div className="mcp-flow" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 40 }}>
          {MCP_FLOW.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="mock4" style={{ padding: 22, height: '100%', position: 'relative' }}>
                <div className="lbl" style={{ fontSize: 10.5, marginBottom: 14 }}>step {i + 1}</div>
                <span style={{ color: 'var(--lp4-accent)' }}><f.Icon size={22} strokeWidth={1.8} /></span>
                <div style={{ fontSize: 17, fontWeight: 600, margin: '12px 0 6px' }}>{f.title}</div>
                <div style={{ color: 'var(--lp4-dim)', fontSize: 14, lineHeight: 1.55 }}>{f.text}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mock4" style={{ padding: 'clamp(20px, 3.5vw, 36px)', marginBottom: 56, ...mono, fontSize: 13.5, lineHeight: 1.9, overflowX: 'auto' }}>
          <Reveal><div style={{ color: 'var(--lp4-dim)' }}>{'// "pay alice 0.05 eth, then show me my stealth addresses"'}</div></Reveal>
          <Reveal delay={100}><div><span style={{ color: 'var(--lp4-accent)' }}>call</span> get_balance() <span style={{ color: 'var(--lp4-green)' }}>→ 0.42 ETH</span></div></Reveal>
          <Reveal delay={200}><div><span style={{ color: 'var(--lp4-accent)' }}>call</span> {'list_recipients({ name: "alice" })'} <span style={{ color: 'var(--lp4-green)' }}>→ 0x91a…3fE2</span></div></Reveal>
          <Reveal delay={300}><div><span style={{ color: 'var(--lp4-accent)' }}>call</span> {'prepare_transfer({ amount: 0.05, token: "ETH", to: "alice" })'} <span style={{ color: 'var(--lp4-green)' }}>→ staged · awaiting YES</span></div></Reveal>
          <Reveal delay={400}><div><span style={{ color: 'var(--lp4-accent)' }}>call</span> list_stealth_addresses() <span style={{ color: 'var(--lp4-green)' }}>→ 2 active · 1 funded</span></div></Reveal>
          <Reveal delay={500}><div style={{ color: 'var(--lp4-dim)' }}>{'// execution is not a tool — only your confirmation can trigger it'}</div></Reveal>
        </div>

        <div style={{ display: 'grid', gap: 40 }}>
          {MCP_GROUPS.map((g, gi) => (
            <div key={g.label}>
              <Reveal delay={gi * 60}><div className="lbl" style={{ marginBottom: 14 }}>{g.label}</div></Reveal>
              {g.tools.map((t, i) => (
                <Reveal key={t.name} delay={i * 80}>
                  <div className="lrow" style={{ gridTemplateColumns: 'minmax(180px, 280px) 1fr', gap: 30, padding: '22px 8px' }}>
                    <div style={{ ...mono, fontSize: 16, fontWeight: 500, color: 'var(--lp4-ink)' }}>{t.name}</div>
                    <p className="sub" style={{ margin: 0, fontSize: 16 }}>{t.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="sub" style={{ marginTop: 44 }}>
            Ten tools today, served over stdio as a standard MCP server — plug the same wallet tools into any MCP-compatible client.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ---------- 03 delegation ----------
// The real Walletrix security model, not marketing fiction.
const DEFENSE = [
  {
    Icon: KeyRound,
    title: 'Scoped delegation',
    text: 'The agent acts only on the authority you grant — specific actions, never blanket access to your funds.',
  },
  {
    Icon: Bot,
    title: 'Isolated agent wallet',
    text: 'It spends only from its own dedicated wallet, funded by you. Your main keys never touch the chat, and the worst case is capped at what you fund it with.',
  },
  {
    Icon: Check,
    title: 'Confirm before it moves',
    text: 'Every transfer is staged, shown to you, and single-use. It expires after two minutes if you don\'t say yes.',
  },
  {
    Icon: Ghost,
    title: 'Stealth receives',
    text: 'A fresh one-time address for every receive, issued from Telegram or the dashboard. Payments never trace back to your main wallet.',
  },
]

export function Defense() {
  return (
    <section id="defense" className="sec">
      <div className="wrap">
        <SecHead
          index="03"
          label="Delegation"
          title="Autonomy, with limits you set."
          sub="The agent takes action on specific delegated authorities — and every key stays encrypted at rest with AES-256-GCM."
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
          index="05"
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
        <a className="nlink" href="#agent" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Agent</a>
        <a className="nlink" href="#mcp" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>MCP tools</a>
        <a className="nlink" href="#defense" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Delegation</a>
        <a className="nlink" href="#chains" style={{ color: 'var(--lp4-dim)', textDecoration: 'none', fontSize: 14 }}>Chains</a>
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
