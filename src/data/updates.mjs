// What MeroAlpha Agent does today, and what is being built, for the changelog page (components/Updates.astro).
// Newest first. Keep every line true of the app; GitHub releases carry the version-by-version notes.

// 24-pt outline icons in the style of the app's icons.tsx.
export const areas = {
  agent: { label: 'Agent', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>' },
  paper: { label: 'Paper trading', icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>' },
  charts: { label: 'Charts', icon: '<path d="M7 4v16M17 4v16"/><rect x="5" y="8" width="4" height="7" rx="1"/><rect x="15" y="6" width="4" height="9" rx="1"/>' },
  privacy: { label: 'Privacy', icon: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>' },
};

export const shipped = [
  { area: 'agent', kind: 'Feature', title: 'Ask the agent', body: 'Ask about a stock, the market or a report. The agent reads the web and NEPSE sources in its own browser and answers with citations to the pages it read.', href: '/#demo' },
  { area: 'agent', kind: 'Feature', title: 'Bring your own Claude or Codex', body: 'Connect your own agent over the Agent Client Protocol, signed in with its own CLI.', href: '/#data' },
  { area: 'paper', kind: 'Feature', title: 'Plans with hard limits', body: 'After the close, the agent drafts plans for the watchlist: an entry ceiling, a fixed stop and target, and 1% of equity at risk.', href: '/#day' },
  { area: 'paper', kind: 'Feature', title: 'Five-minute triggers', body: 'A plan triggers on a five-minute candle above the first 15 minutes’ high, and never after 14:30 NPT.', href: '/#day' },
  { area: 'paper', kind: 'Feature', title: 'Fills from trade prints', body: 'Paper orders fill only from fresh trade prints, with fees, slippage and a 10% participation cap.', href: '/#day' },
  { area: 'paper', kind: 'Feature', title: 'Report card', body: 'Every call is graded against the NEPSE index five sessions later, and the report card keeps score.', href: '/#tour' },
  { area: 'paper', kind: 'Feature', title: 'Paper portfolio', body: 'Cash, holdings, realised gains and fees in virtual NPR, with a 20% loss limit. No brokerage is connected.', href: '/#tour' },
  { area: 'charts', kind: 'Feature', title: 'Advanced chart', body: 'Candles, indicators and drawing tools on MeroAlpha’s own chart engine, with 5-minute to weekly bars and a NEPSE comparison.', href: '/#tour' },
  { area: 'charts', kind: 'Feature', title: 'Stock page', body: 'The last close, a price graph, the 52-week range, news and your paper position. Information only: there are no buy or sell buttons.', href: '/#tour' },
  { area: 'privacy', kind: 'Feature', title: 'Local by default', body: 'Captured pages, findings and the paper account live in your Library folder.', href: '/privacy' },
  { area: 'privacy', kind: 'Feature', title: 'Optional sharing', body: 'Sharing is a separate switch, off by default. Turned on, findings, your agent’s checks and questions, and graded paper calls go to other users, never the pages themselves.', href: '/privacy' },
];

// The roadmap, in order. The first two are in development; the rest are planned.
export const roadmap = [
  { title: 'AI agentic paper trading', body: 'The agent researches, drafts plans with hard limits and trades a paper account in virtual NPR, graded against NEPSE.', status: 'In development', href: '/#day' },
  { title: 'Advanced charts and analytics', body: 'MeroAlpha’s own chart engine, with candles, indicators, drawing tools and analytics for every NEPSE stock.', status: 'In development', href: '/#tour' },
  { title: 'Notifications and alerts', body: 'Hear about the moments that matter: price levels, triggered plans and the agent’s findings.', status: 'Planned' },
  { title: 'Custom scripting for strategy backtesting', body: 'Write your own strategies and test them against NEPSE history before they reach a paper account.', status: 'Planned' },
  { title: 'Insights engine', body: 'Insights drawn from the agent’s research and your paper results.', status: 'Planned' },
];
