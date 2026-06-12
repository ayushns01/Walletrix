// lib.jsx — icon set (Lucide path data), mock data, helpers. Exports to window.
(function () {
  // ---- Icons: Lucide path data (stroke icons) ----
  const PATHS = {
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><path d="M18 12a1 1 0 0 0 0 2h2v-2z"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    trendUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    trendDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    arrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ghost: '<path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  };

  function Icon({ name, size = 18, stroke = 2, style = {}, className = '' }) {
    const d = PATHS[name];
    if (!d) return null;
    return (
      <svg
        className={className}
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, ...style }}
        dangerouslySetInnerHTML={{ __html: d }}
      />
    );
  }

  // ---- Chain themes ----
  const CHAINS = {
    ethereum: {
      id: 'ethereum', name: 'Ethereum', short: 'ETH', label: 'Ethereum Mainnet',
      sym: 'Ξ', a: '#4d84ff', b: '#22d3ee', glow: '#3f72ee', native: 'ETH',
      addr: '0x8F4c2A1bE7d93C5a0F26B8d4E1c7A93f0b5D2E61',
    },
    bitcoin: {
      id: 'bitcoin', name: 'Bitcoin', short: 'BTC', label: 'Bitcoin Mainnet',
      sym: '₿', a: '#f97316', b: '#f59e0b', glow: '#ea580c', native: 'BTC',
      addr: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    },
    solana: {
      id: 'solana', name: 'Solana', short: 'SOL', label: 'Solana Mainnet',
      sym: '◎', a: '#d946ef', b: '#8b5cf6', glow: '#a21caf', native: 'SOL',
      addr: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
    },
    sepolia: {
      id: 'sepolia', name: 'Sepolia', short: 'ETH', name2: 'Sepolia Testnet', label: 'Sepolia Testnet',
      sym: 'Ξ', a: '#14b8a6', b: '#22d3ee', glow: '#0d9488', native: 'ETH', testnet: true,
      addr: '0x8F4c2A1bE7d93C5a0F26B8d4E1c7A93f0b5D2E61',
    },
  };

  // ---- Holdings per chain ----
  const HOLDINGS = {
    ethereum: [
      { sym: 'ETH', name: 'Ethereum', bal: 18.402, price: 3418.22, chg: 2.41, color: '#627eea' },
      { sym: 'USDC', name: 'USD Coin', bal: 24180.0, price: 1.0, chg: 0.01, color: '#2775ca' },
      { sym: 'WBTC', name: 'Wrapped Bitcoin', bal: 0.412, price: 67220.5, chg: -1.18, color: '#f09242' },
      { sym: 'LINK', name: 'Chainlink', bal: 1240.5, price: 17.84, chg: 5.62, color: '#2a5ada' },
      { sym: 'UNI', name: 'Uniswap', bal: 880.0, price: 9.12, chg: -3.04, color: '#ff007a' },
      { sym: 'AAVE', name: 'Aave', bal: 36.2, price: 102.55, chg: 4.19, color: '#b6509e' },
    ],
    bitcoin: [
      { sym: 'BTC', name: 'Bitcoin', bal: 1.8423, price: 67220.5, chg: -1.18, color: '#f7931a' },
    ],
    solana: [
      { sym: 'SOL', name: 'Solana', bal: 642.18, price: 168.42, chg: 6.83, color: '#9945ff' },
      { sym: 'USDC', name: 'USD Coin', bal: 5210.0, price: 1.0, chg: 0.0, color: '#2775ca' },
      { sym: 'JUP', name: 'Jupiter', bal: 9800.0, price: 0.92, chg: 12.4, color: '#c8f284' },
      { sym: 'JTO', name: 'Jito', bal: 1420.0, price: 2.88, chg: -2.1, color: '#22d3ee' },
      { sym: 'BONK', name: 'Bonk', bal: 41200000, price: 0.0000241, chg: 18.7, color: '#f9a825' },
    ],
    sepolia: [
      { sym: 'ETH', name: 'Sepolia ETH', bal: 4.5, price: 0, chg: 0, color: '#627eea', test: true },
      { sym: 'USDC', name: 'Test USDC', bal: 1000, price: 0, chg: 0, color: '#2775ca', test: true },
      { sym: 'DAI', name: 'Test DAI', bal: 1000, price: 0, chg: 0, color: '#f5ac37', test: true },
      { sym: 'WETH', name: 'Wrapped Ether', bal: 2.0, price: 0, chg: 0, color: '#ec4899', test: true },
    ],
  };

  // ---- Wallets ----
  const WALLETS = [
    { id: 'main', name: 'Main Vault', emoji: '🛰️', kind: 'Personal' },
    { id: 'trading', name: 'Trading Desk', emoji: '📈', kind: 'Personal' },
    { id: 'cold', name: 'Cold Storage', emoji: '🧊', kind: 'Hardware' },
    { id: 'dao', name: 'Orbit DAO', emoji: '🌐', kind: 'Multisig 3/5' },
  ];

  // ---- Notifications ----
  const NOTIFS = [
    { id: 1, icon: 'arrowDown', title: 'Received 2.5 ETH', meta: 'from 0x91a…3fE2 · 4m ago', tone: 'pos', unread: true },
    { id: 2, icon: 'bot', title: 'Bot executed swap', meta: '120 USDC → 0.035 ETH · 22m ago', tone: 'accent', unread: true },
    { id: 3, icon: 'ghost', title: 'Stealth payment ready', meta: '0.8 ETH waiting to claim · 1h ago', tone: 'accent', unread: true },
    { id: 4, icon: 'users', title: 'Multisig needs you', meta: 'Orbit DAO · 2 of 3 signed · 3h ago', tone: 'warn', unread: false },
    { id: 5, icon: 'shield', title: 'New device approved', meta: 'MacBook Pro · 1d ago', tone: 'muted', unread: false },
  ];

  // ---- Recent activity ----
  const ACTIVITY = [
    { dir: 'in', label: 'Received', sym: 'ETH', amt: 2.5, usd: 8545.55, who: '0x91a…3fE2', time: '4m' },
    { dir: 'bot', label: 'Bot swap', sym: 'USDC', amt: 120, usd: 120, who: '→ 0.035 ETH', time: '22m' },
    { dir: 'out', label: 'Sent', sym: 'USDC', amt: 1500, usd: 1500, who: 'alice.eth', time: '2h' },
    { dir: 'in', label: 'Received', sym: 'LINK', amt: 340, usd: 6065.6, who: 'staking', time: '5h' },
    { dir: 'out', label: 'Sent', sym: 'ETH', amt: 0.75, usd: 2563.66, who: '0x44c…9bA1', time: '1d' },
  ];

  // ---- Helpers ----
  const fmtUSD = (n, dp = 2) =>
    '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtNum = (n, dp = 4) =>
    Number(n).toLocaleString('en-US', { maximumFractionDigits: dp });
  const truncAddr = (a, l = 6, r = 4) => (a.length > l + r ? `${a.slice(0, l)}…${a.slice(-r)}` : a);

  Object.assign(window, {
    Icon, CHAINS, HOLDINGS, WALLETS, NOTIFS, ACTIVITY, fmtUSD, fmtNum, truncAddr,
  });
})();
