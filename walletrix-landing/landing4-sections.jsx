// landing4-sections.jsx — Nav, Hero, Chains, Agent, Defense, Console preview, Footer.
// Minimal dark layout, scroll reveals, live tickers. Exports to window.
(function () {
  const { Icon, ACTIVITY, fmtUSD } = window;
  const APP_URL = 'Walletrix Dashboard.html';
  const EASE = 'cubic-bezier(.16,1,.3,1)';

  // ---------- hooks ----------
  // polling-based in-view (IntersectionObserver does NOT fire in this preview iframe,
  // and programmatic scroll is a no-op — so we poll bounding rect on a timeout loop)
  function useInView(thresholdFrac = 0.93) {
    const ref = React.useRef(null);
    const [seen, setSeen] = React.useState(false);
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const vh = window.innerHeight || 800;
        if (el.getBoundingClientRect().top < vh * thresholdFrac) { setSeen(true); return; }
        setTimeout(tick, 130);
      };
      tick();
      return () => { alive = false; };
    }, []);
    return [ref, seen];
  }

  function Reveal({ children, delay = 0, as = 'div', style = {}, className = '' }) {
    const [ref, seen] = useInView();
    // hard fallback: force final state after the animation window in case CSS
    // transitions are frozen (DOM capture / unfocused tab) — guarantees visibility
    React.useEffect(() => {
      if (!seen) return;
      const el = ref.current; if (!el) return;
      const t = setTimeout(() => {
        if (!el) return;
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.filter = 'none';
      }, 1100 + delay);
      return () => clearTimeout(t);
    }, [seen]);
    const Tag = as;
    return (
      <Tag ref={ref} className={`r4 ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
        {children}
      </Tag>
    );
  }

  // smooth random-walk number: drifts toward a new target every ~1.6s, eased at ~8fps
  function useLiveNumber(base, vol = 0.0012) {
    const [shown, setShown] = React.useState(base);
    React.useEffect(() => {
      let alive = true, target = base, current = base;
      const drift = setInterval(() => { target = target * (1 + (Math.random() - 0.5) * 2 * vol); }, 1600);
      const step = () => {
        if (!alive) return;
        current += (target - current) * 0.18;
        setShown(current);
        setTimeout(step, 110);
      };
      step();
      return () => { alive = false; clearInterval(drift); };
    }, []);
    return shown;
  }

  // ---------- sparkline (ref-driven canvas, no React churn) ----------
  function Spark({ color = '#4d84ff', w = 120, h = 36, lw = 1.5, glow = true, speed = 420 }) {
    const ref = React.useRef(null);
    const [inRef, seen] = useInView();
    React.useEffect(() => {
      if (!seen) return;
      const canvas = ref.current; if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const N = 42;
      let v = 0.5;
      const data = Array.from({ length: N }, () => (v = Math.min(0.92, Math.max(0.08, v + (Math.random() - 0.5) * 0.16))));
      let alive = true, progress = 0, timer = null;
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        const upto = Math.max(2, Math.floor(N * Math.min(1, progress)));
        ctx.beginPath();
        for (let i = 0; i < upto; i++) {
          const x = (i / (N - 1)) * w;
          const y = h - data[i] * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 7; }
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      // draw-in animation, then live ticking
      const drawIn = () => {
        if (!alive) return;
        progress += reduced ? 1 : 0.06;
        draw();
        if (progress < 1) requestAnimationFrame(drawIn);
        else if (!reduced) {
          timer = setInterval(() => {
            if (!alive) return;
            data.shift();
            data.push(Math.min(0.92, Math.max(0.08, data[N - 2] + (Math.random() - 0.5) * 0.16)));
            draw();
          }, speed);
        }
      };
      drawIn();
      return () => { alive = false; if (timer) clearInterval(timer); };
    }, [seen, color]);
    return <span ref={inRef} style={{ display: 'inline-block', width: w, height: h }}><canvas ref={ref} style={{ width: w, height: h, display: 'block' }}></canvas></span>;
  }

  // ---------- nav ----------
  function Nav() {
    const [scrolled, setScrolled] = React.useState(false);
    React.useEffect(() => {
      const f = () => setScrolled(window.scrollY > 30);
      f();
      window.addEventListener('scroll', f, { passive: true });
      return () => window.removeEventListener('scroll', f);
    }, []);
    return (
      <nav id="nav4" className={scrolled ? 'scrolled' : ''}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 28, height: 68 }}>
          <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)', marginRight: 'auto' }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, border: '1.5px solid var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent)', boxShadow: '0 0 18px -4px var(--accent)' }}><Icon name="wallet" size={14} stroke={2.4}></Icon></span>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Walletrix</span>
          </a>
          <div style={{ display: 'flex', gap: 26 }} className="navlinks">
            <a className="nlink" href="#chains">Chains</a>
            <a className="nlink" href="#agent">Agent</a>
            <a className="nlink" href="#defense">Security</a>
            <a className="nlink" href="#console">Console</a>
          </div>
          <a className="btn4 primary" href={APP_URL} style={{ padding: '10px 22px', fontSize: 14.5 }}>Launch app</a>
        </div>
      </nav>
    );
  }

  // ---------- hero ----------
  function HeroWords({ text, startDelay = 0, grad = false }) {
    return text.split(' ').map((word, i) => (
      <React.Fragment key={i}>
        <span className="hw">
          <span className={grad ? 'grad-ink' : ''} style={{ transitionDelay: `${startDelay + i * 95}ms` }}>{word}</span>
        </span>
        {i < text.split(' ').length - 1 ? ' ' : ''}
      </React.Fragment>
    ));
  }

  function Hero() {
    const h1Ref = React.useRef(null);
    // hard fallback: if CSS transitions are frozen (capture / unfocused tab),
    // force every headline word to its final position after the entrance window
    React.useEffect(() => {
      const t = setTimeout(() => {
        const el = h1Ref.current; if (!el) return;
        el.querySelectorAll('.hw > span').forEach(s => { s.style.transition = 'none'; s.style.transform = 'none'; });
        const rule = el.parentNode.querySelector('.hl-rule');
        if (rule) { rule.style.transition = 'none'; rule.style.width = 'min(54%, 560px)'; }
      }, 2200);
      return () => clearTimeout(t);
    }, []);
    return (
      <header id="top" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '120px 0 60px' }}>
        <div className="wrap" style={{ textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 30 }}>
          <Reveal delay={120}>
            <div className="lbl" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap', border: '1px solid var(--line)', borderRadius: 999, padding: '8px 16px', background: 'rgba(8,11,20,0.4)', backdropFilter: 'blur(6px)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)', animation: 'pulseDot4 2.4s ease-in-out infinite' }}></span>
              ETH · BTC · SOL — one console
            </div>
          </Reveal>
          <div style={{ display: 'grid', justifyItems: 'center' }}>
            <h1 ref={h1Ref} style={{ fontSize: 'clamp(58px, 10.5vw, 138px)', lineHeight: 0.96, fontWeight: 700, letterSpacing: '-0.045em' }}>
              <HeroWords text="Crypto," startDelay={220}></HeroWords>
              <span style={{ color: 'var(--dim)' }}> </span>
              <HeroWords text="minus" startDelay={330}></HeroWords>
              <br />
              <HeroWords text="the noise." startDelay={520} grad={true}></HeroWords>
            </h1>
            <span className="hl-rule"></span>
          </div>
          <Reveal delay={760}>
            <p className="sub" style={{ margin: '6px auto 0', textAlign: 'center' }}>
              One wallet for Ethereum, Bitcoin and Solana — with an AI agent on Telegram that executes while you sleep.
            </p>
          </Reveal>
          <Reveal delay={880}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a className="btn4 primary" href={APP_URL}>Launch app <Icon name="arrowUpRight" size={17} stroke={2.4}></Icon></a>
              <a className="btn4 ghost" href="#chains">See it move</a>
            </div>
          </Reveal>
        </div>
      </header>
    );
  }

  // ---------- section header ----------
  function SecHead({ index, label, title, sub }) {
    return (
      <div style={{ display: 'grid', gap: 22, marginBottom: 64 }}>
        <Reveal><div className="lbl">{index} — {label}</div></Reveal>
        <Reveal delay={120}><h2>{title}</h2></Reveal>
        {sub ? <Reveal delay={240}><p className="sub" style={{ margin: 0 }}>{sub}</p></Reveal> : null}
      </div>
    );
  }

  // ---------- 01 chains ----------
  const CHAIN_ROWS = [
    { sym: 'Ξ', name: 'Ethereum', net: 'mainnet', color: '#4d84ff', price: 3418.22, chg: +2.41 },
    { sym: '₿', name: 'Bitcoin', net: 'mainnet', color: '#f97316', price: 67220.50, chg: -1.18 },
    { sym: '◎', name: 'Solana', net: 'mainnet', color: '#a855f7', price: 168.42, chg: +6.83 },
  ];

  function ChainRow({ c, delay }) {
    const price = useLiveNumber(c.price, 0.0014);
    const up = c.chg >= 0;
    return (
      <Reveal delay={delay}>
        <div className="lrow" style={{ gridTemplateColumns: 'auto 1fr auto auto auto', gap: 26 }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', border: `1.5px solid ${c.color}55`, color: c.color, display: 'grid', placeItems: 'center', fontSize: 24, textShadow: `0 0 16px ${c.color}` }}>{c.sym}</span>
          <div>
            <div style={{ fontSize: 21, fontWeight: 600 }}>{c.name}</div>
            <div className="lbl" style={{ marginTop: 5, fontSize: 11 }}>{c.net}</div>
          </div>
          <span className="hide-sm"><Spark color={c.color} w={130} h={38}></Spark></span>
          <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 18, minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(price)}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: up ? 'var(--green)' : 'var(--red)', minWidth: 64, textAlign: 'right' }}>{up ? '+' : ''}{c.chg.toFixed(2)}%</div>
        </div>
      </Reveal>
    );
  }

  function Chains() {
    return (
      <section id="chains" className="sec">
        <div className="wrap">
          <SecHead index="01" label="Chains" title="Three chains. One surface." sub="No tab-hopping, no bridges to think about. Your Ethereum, Bitcoin and Solana balances live on the same quiet screen."></SecHead>
          <div>
            {CHAIN_ROWS.map((c, i) => <ChainRow key={c.name} c={c} delay={i * 120}></ChainRow>)}
          </div>
        </div>
      </section>
    );
  }

  // ---------- 02 agent ----------
  const CHAT = [
    { from: 'you', text: 'swap 120 usdc to eth when gas drops under 12' },
    { from: 'bot', text: 'Watching gas. I\u2019ll execute the moment it crosses 12 gwei.' },
    { from: 'bot', receipt: true, text: '11.8 gwei — executed. 120 USDC → 0.0351 ETH' },
  ];

  function Agent() {
    const [ref, seen] = useInView(0.7);
    const [step, setStep] = React.useState(0); // counts messages shown; typing dots between
    React.useEffect(() => {
      if (!seen) return;
      const delays = [400, 1700, 3300];
      const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d));
      return () => timers.forEach(clearTimeout);
    }, [seen]);
    const typing = seen && step >= 1 && step < CHAT.length;
    return (
      <section id="agent" className="sec">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 70, alignItems: 'center' }} data-agent-grid="">
          <div>
            <SecHead index="02" label="Agent" title="Type it. It's done." sub="A Walletrix agent lives in your Telegram. Gas triggers, limit orders, DCA schedules — say it once in plain words, it runs around the clock."></SecHead>
            <Reveal delay={300}>
              <div className="lbl" style={{ fontSize: 11.5, lineHeight: 2.2 }}>gas triggers · limits · dca · alerts</div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <div ref={ref} className="mock4" style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'color-mix(in oklab, var(--accent) 22%, transparent)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Icon name="bot" size={17}></Icon></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Walletrix Agent</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>online</div>
                </div>
              </div>
              <div style={{ padding: '26px 22px 30px', display: 'grid', gap: 14, minHeight: 240, alignContent: 'start' }}>
                {CHAT.slice(0, step).map((m, i) => (
                  <div key={i} className="msg4 on" style={{ justifySelf: m.from === 'you' ? 'end' : 'start', maxWidth: '85%' }}>
                    {m.receipt ? (
                      <div style={{ border: '1px solid color-mix(in oklab, var(--green) 40%, transparent)', borderRadius: 14, padding: '13px 16px', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--green)', display: 'flex', gap: 10, alignItems: 'center', background: 'color-mix(in oklab, var(--green) 7%, transparent)' }}>
                        <Icon name="check" size={15} stroke={2.6}></Icon> {m.text}
                      </div>
                    ) : (
                      <div style={{ borderRadius: 14, padding: '12px 16px', fontSize: 14.5, lineHeight: 1.5, background: m.from === 'you' ? 'var(--accent)' : 'rgba(150,175,225,0.09)', color: m.from === 'you' ? '#04050a' : 'var(--ink)', fontWeight: m.from === 'you' ? 500 : 400 }}>{m.text}</div>
                    )}
                  </div>
                ))}
                {typing ? (
                  <div style={{ display: 'flex', gap: 5, padding: '12px 16px', borderRadius: 14, background: 'rgba(150,175,225,0.09)', width: 'max-content' }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--dim)', animation: `dotPulse 1.1s ${i * 0.18}s ease-in-out infinite` }}></span>)}
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  // ---------- 03 defense ----------
  const DEFENSE = [
    { icon: 'ghost', title: 'Stealth payments', text: 'One-time addresses for every receive. Nothing traces back to your vault.' },
    { icon: 'users', title: 'Multisig vaults', text: '3-of-5 signing for anything that matters. No single point of failure.' },
    { icon: 'key', title: 'Local keys', text: 'Keys are minted in your device\u2019s secure enclave. They never travel.' },
  ];

  function Defense() {
    return (
      <section id="defense" className="sec">
        <div className="wrap">
          <SecHead index="03" label="Defense" title="Security that stays out of the way." sub="Everything is protected by default — nothing asks for your attention until it has to."></SecHead>
          <div>
            {DEFENSE.map((d, i) => (
              <Reveal key={d.title} delay={i * 120}>
                <div className="lrow" style={{ gridTemplateColumns: 'auto minmax(140px, 240px) 1fr', gap: 30 }}>
                  <span style={{ color: 'var(--accent)', opacity: 0.9 }}><Icon name={d.icon} size={24} stroke={1.8}></Icon></span>
                  <div style={{ fontSize: 21, fontWeight: 600 }}>{d.title}</div>
                  <p className="sub" style={{ margin: 0, fontSize: 16.5 }}>{d.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ---------- 04 console preview ----------
  function Console() {
    const total = useLiveNumber(148205.16, 0.0007);
    const delta = useLiveNumber(3420.55, 0.004);
    return (
      <section id="console" className="sec">
        <div className="wrap">
          <SecHead index="04" label="Console" title="Your portfolio, breathing." sub="Live balances, live charts, live agent activity — the dashboard updates itself so you don't have to."></SecHead>
          <Reveal delay={150}>
            <div className="mock4" style={{ padding: 'clamp(22px, 4vw, 44px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
                <span className="lbl" style={{ fontSize: 11 }}>Main vault</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulseDot4 2.4s ease-in-out infinite' }}></span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', letterSpacing: '0.14em' }}>LIVE</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>+{fmtUSD(delta)} today</span>
              </div>
              <div style={{ fontSize: 'clamp(44px, 6.5vw, 76px)', fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtUSD(total)}</div>
              <div style={{ margin: '34px -8px 30px' }}>
                <Spark color={getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4d84ff'} w={Math.min(960, window.innerWidth - 120)} h={90} lw={2} speed={500}></Spark>
              </div>
              <div style={{ borderTop: '1px solid var(--line)' }}>
                {ACTIVITY.slice(0, 4).map((a, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 18, alignItems: 'center', padding: '15px 4px', borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                      <span style={{ color: a.dir === 'in' ? 'var(--green)' : a.dir === 'bot' ? 'var(--accent)' : 'var(--dim)' }}>
                        <Icon name={a.dir === 'in' ? 'arrowDown' : a.dir === 'bot' ? 'bot' : 'arrowUp'} size={16}></Icon>
                      </span>
                      <span style={{ fontSize: 15 }}>{a.label} <span style={{ color: 'var(--dim)' }}>· {a.who}</span></span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>{a.amt} {a.sym}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', minWidth: 34, textAlign: 'right' }}>{a.time}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={250}>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 54 }}>
              <a className="btn4 primary" href={APP_URL}>Open the console <Icon name="arrowUpRight" size={17} stroke={2.4}></Icon></a>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  // ---------- footer ----------
  function Footer() {
    return (
      <footer style={{ paddingTop: '6rem', borderTop: '1px solid var(--line)', overflow: 'hidden' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', paddingBottom: 56 }}>
          <span className="lbl" style={{ marginRight: 'auto' }}>© 2026 Walletrix</span>
          <a className="nlink" href="#chains" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 14 }}>Chains</a>
          <a className="nlink" href="#agent" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 14 }}>Agent</a>
          <a className="nlink" href="#defense" style={{ color: 'var(--dim)', textDecoration: 'none', fontSize: 14 }}>Security</a>
          <a className="nlink" href={APP_URL} style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 14 }}>Launch app ↗</a>
        </div>
        <Reveal>
          <div className="giant" style={{ textAlign: 'center', transform: 'translateY(12%)' }}>WALLETRIX</div>
        </Reveal>
      </footer>
    );
  }

  Object.assign(window, {
    Nav4: Nav, Hero4: Hero, Chains4: Chains, Agent4: Agent,
    Defense4: Defense, Console4: Console, Footer4: Footer, Reveal4: Reveal,
  });
})();
