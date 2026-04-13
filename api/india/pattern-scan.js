// Vercel Serverless Function: /api/india/pattern-scan  ── v2 (swing-point based)

const YAHOO_BASE = "https://query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── NSE Universes ─────────────────────────────────────────────────────────────
const NIFTY50 = [
  "RELIANCE","TCS","HDFCBANK","BHARTIARTL","ICICIBANK","INFOSYS","SBIN","HINDUNILVR","LICI",
  "ITC","KOTAKBANK","LT","M&M","AXISBANK","BAJFINANCE","HCLTECH","TITAN","ASIANPAINT","WIPRO",
  "NESTLEIND","ULTRACEMCO","MARUTI","SUNPHARMA","INDUSINDBK","NTPC","POWERGRID","BAJAJFINSV",
  "TECHM","JSWSTEEL","ADANIENT","ADANIGREEN","ADANIPORTS","DIVISLAB","COALINDIA","CIPLA",
  "ONGC","BPCL","BRITANNIA","EICHERMOT","TATACONSUM","GRASIM","HEROMOTOCO","HINDALCO",
  "SBILIFE","DRREDDY","HDFCLIFE","APOLLOHOSP","BAJAJ-AUTO","TATAMOTORS","TATASTEEEL",
].map(s => `${s}.NS`);

const NIFTY100_EXTRA = [
  "SIEMENS","ABB","HAVELLS","PIDILITIND","BERGEPAINT","DABUR","MARICO","COLPAL","MCDOWELL-N",
  "GLAXO","LUPIN","TORNTPHARM","BIOCON","ALKEM","AMBUJACEM","SHREECEM","GAIL","IOC","HINDPETRO",
  "VEDL","HINDZINC","NATIONALUM","NMDC","SAIL","JSWENERGY","TATAPOWER","ADANIPOWER","ADANITRANS",
  "ATGL","CANBK","BANKBARODA","PNB","UNIONBANK","IDFC","BANDHANBNK","MUTHOOTFIN","CHOLAFIN",
  "BAJAJHLDNG","LICHSGFIN","PFC","RECLTD","IRFC","ZOMATO","NYKAA","POLICYBZR","PAYTM","DMART",
  "TRENT","CAMS","CDSL","BSE","MCX","IRCTC","INDIANB","FEDERALBNK","IDFCFIRSTB","AUBANK",
].map(s => `${s}.NS`);

const NIFTY500_EXTRA = [
  "AAVAS","ABCAPITAL","ABFRL","APLAPOLLO","ASTRAL","BAJAJCON","BALKRISIND","BATAINDIA","BBTC",
  "BLUEDART","CEATLTD","CENTURYTEX","CESC","CHAMBLFERT","CONCOR","COROMANDEL","CROMPTON",
  "CUMMINSIND","DCB","DEEPAKNI","DELTACORP","DIXON","ELGIEQUIP","EMAMILTD","ENGINERSIN",
  "EQUITASBNK","ESCORTS","EXIDEIND","FINOFINANCE","GALAXYSURF","GNFC","GODREJAGRO","GODREJCP",
  "GODREJIND","GODREJPROP","GRANULES","GRINDWELL","GSFC","GUJALKALI","GULFINDS","HAPPSTMNDS",
  "HDFCAMC","HERCULES","HINDCOPPER","HONAUT","IBREALEST","IBULHSGFIN","INDHOTEL","INDOCO",
  "INDSWFTLAB","INFIBEAM","INTELLECT","IPCALAB","JKCEMENT","JKLAKSHMI","JKPAPER","JKTYRE",
  "JUBLFOOD","JUBLINGREA","KAJARIACER","KEC","KIMS","KPITTECH","LALPATHLAB","LAXMIMACH",
  "LINDEINDIA","LTTS","LUXIND","MAHINDCIE","MAHSCOOTER","MANAPPURAM","MASFIN","MAXHEALTH",
  "MFSL","METROPOLIS","MINDTREE","MPHASIS","MRF","NATCOPHARM","NAVINFLUOR","NBCC","NESCO",
  "NIACL","NIIT","NLCINDIA","NOCIL","NSLNISP","AARTIIND","PERSISTENT","PFIZER","PHOENIXLTD",
  "PRESTIGE","PRINCEPIPES","RADICO","RAJESHEXPO","RAMCOCEM","RAYMOND","REDINGTON","RELAXO",
  "RESPONIND","RITES","ROLEX","ROSSARI","SAFARI","SAREGAMA","SCHAEFFLER","SEQUENT","SHYAMMETL",
  "SJVN","SKFINDIA","SONACOMS","SOMICONV","SRTRANSFIN","STAR","SUDARSCHEM","SUPPETRO","SUVENPHAR",
  "SYMPHONY","TANLA","TATACHEM","TATACOFFEE","TATAELXSI","TATAINVEST","TCNSBRANDS","TEAMLEASE",
  "THERMAX","TIMKEN","TITAGARH","TTKPRESTIG","UCOBANK","UJJIVANSFB","UTIAMC","VAIBHAVGBL",
  "VARDHACRLC","VGUARD","VINATIORGA","VMART","VOLTAS","VSTIND","WHIRLPOOL","WOCKPHARMA","ZYDUSLIFE",
].map(s => `${s}.NS`);

const NIFTY100 = [...new Set([...NIFTY50, ...NIFTY100_EXTRA])];
const NIFTY500 = [...new Set([...NIFTY100, ...NIFTY500_EXTRA])];

// ── Core Math ─────────────────────────────────────────────────────────────────
function linReg(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0, yAtX: (x) => points[0]?.y ?? 0 };
  const xMean = points.reduce((s, p) => s + p.x, 0) / n;
  const yMean = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0, ssTot = 0;
  for (const p of points) {
    num += (p.x - xMean) * (p.y - yMean);
    den += (p.x - xMean) ** 2;
    ssTot += (p.y - yMean) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2, yAtX: (x) => slope * x + intercept };
}

function findSwingHighs(bars, window = 5) {
  const out = [];
  for (let i = window; i < bars.length - window; i++) {
    const h = bars[i].high;
    let ok = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && bars[j].high >= h) { ok = false; break; }
    }
    if (ok) out.push({ idx: i, val: h });
  }
  return out;
}

function findSwingLows(bars, window = 5) {
  const out = [];
  for (let i = window; i < bars.length - window; i++) {
    const l = bars[i].low;
    let ok = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && bars[j].low <= l) { ok = false; break; }
    }
    if (ok) out.push({ idx: i, val: l });
  }
  return out;
}

// ── Pattern Detectors v2 ──────────────────────────────────────────────────────
function detectFallingWedge(bars) {
  if (bars.length < 45) return null;
  const lookback = Math.min(65, bars.length - 6);
  const slice = bars.slice(-lookback);
  const sHighs = findSwingHighs(slice, 5);
  const sLows  = findSwingLows(slice, 5);
  if (sHighs.length < 3 || sLows.length < 3) return null;
  const rH = sHighs.slice(-4), rL = sLows.slice(-4);
  const highLine = linReg(rH.map(s => ({ x: s.idx, y: s.val })));
  const lowLine  = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (highLine.slope >= 0 || lowLine.slope >= 0) return null;
  if (highLine.slope >= lowLine.slope) return null;
  if (highLine.r2 < 0.65 || lowLine.r2 < 0.65) return null;
  const xFirst = Math.min(rH[0].idx, rL[0].idx);
  const xLast  = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  const wStart = highLine.yAtX(xFirst) - lowLine.yAtX(xFirst);
  const wEnd   = highLine.yAtX(xLast)  - lowLine.yAtX(xLast);
  if (wStart <= 0 || wEnd <= 0 || wEnd >= wStart) return null;
  const compression = 1 - wEnd / wStart;
  if (compression < 0.30 || xLast - xFirst < 15) return null;
  const lastClose = slice[slice.length - 1].close;
  const curH = highLine.yAtX(lookback - 1), curL = lowLine.yAtX(lookback - 1);
  const pos = curH > curL ? (lastClose - curL) / (curH - curL) : 0.5;
  if (pos > 1.3) return null;
  const r2Avg = (highLine.r2 + lowLine.r2) / 2;
  const confidence = Math.round(Math.min(
    r2Avg * 35 + compression * 35 + Math.min((rH.length + rL.length - 4) * 5, 20) + (pos <= 1.05 ? 10 : 0), 95
  ));
  if (confidence < 55) return null;
  return {
    name: "Falling Wedge", icon: "📐", confidence, color: "violet",
    description: `${rH.length} swing highs · ${rL.length} swing lows · Compression: ${(compression*100).toFixed(0)}% · Fit: ${(r2Avg*100).toFixed(0)}% · ${xLast-xFirst} bars`,
  };
}

function detectBullFlag(bars) {
  if (bars.length < 30) return null;
  for (let flagLen = 5; flagLen <= 18; flagLen++) {
    for (let poleLen = 5; poleLen <= 15; poleLen++) {
      const needed = poleLen + flagLen + 3;
      if (bars.length < needed) continue;
      const poleStart = bars.length - needed, poleEnd = poleStart + poleLen;
      const flagBars = bars.slice(poleEnd);
      const poleOpen = bars[poleStart].close, poleClose = bars[poleEnd - 1].close;
      const poleGain = (poleClose - poleOpen) / poleOpen * 100;
      if (poleGain < 8) continue;
      const poleSlice = bars.slice(poleStart, poleEnd);
      const poleMin = Math.min(...poleSlice.map(b => b.close));
      if (poleMin < poleOpen + (poleClose - poleOpen) * 0.25) continue;
      const flagHighs = flagBars.map(b => b.high), flagLows = flagBars.map(b => b.low);
      const fHigh = Math.max(...flagHighs), fLow = Math.min(...flagLows);
      const flagRange = (fHigh - fLow) / fHigh * 100;
      if (flagRange > 7) continue;
      const poleHeight = poleClose - poleOpen;
      const flagPullback = poleClose - Math.min(...flagBars.map(b => b.close));
      if (flagPullback > poleHeight * 0.5) continue;
      const hReg = linReg(flagHighs.map((h, i) => ({ x: i, y: h })));
      const lReg = linReg(flagLows.map((l, i) => ({ x: i, y: l })));
      const maxSlope = poleClose * 0.004;
      if (hReg.slope > maxSlope || lReg.slope > maxSlope) continue;
      const poleVol = poleSlice.reduce((s, b) => s + b.volume, 0) / poleLen;
      const flagVol = flagBars.reduce((s, b) => s + b.volume, 0) / flagLen;
      const volContracting = flagVol < poleVol * 0.85;
      const gainScore = Math.min(poleGain * 3, 40);
      const tightScore = Math.max(0, (7 - flagRange) * 4);
      const volScore = volContracting ? 20 : 5;
      const pbScore = Math.max(0, (0.5 - flagPullback / poleHeight) * 20);
      const confidence = Math.round(Math.min(gainScore + tightScore + volScore + pbScore, 95));
      if (confidence < 55) continue;
      return {
        name: "Bull Flag", icon: "🏳️", confidence, color: "emerald",
        description: `Pole: +${poleGain.toFixed(1)}% in ${poleLen} bars · Flag range: ${flagRange.toFixed(1)}% · Pullback: ${(flagPullback/poleHeight*100).toFixed(0)}% · Vol: ${volContracting ? "contracting ✓" : "expanding"}`,
      };
    }
  }
  return null;
}

function detectAscendingTriangle(bars) {
  if (bars.length < 40) return null;
  const lookback = Math.min(70, bars.length - 6);
  const slice = bars.slice(-lookback);
  const sHighs = findSwingHighs(slice, 4), sLows = findSwingLows(slice, 4);
  if (sHighs.length < 3 || sLows.length < 3) return null;
  const rH = sHighs.slice(-4), rL = sLows.slice(-4);
  const maxH = Math.max(...rH.map(s => s.val)), minH = Math.min(...rH.map(s => s.val));
  const spread = (maxH - minH) / maxH * 100;
  if (spread > 2.5) return null;
  const lowLine = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (lowLine.slope <= 0 || lowLine.r2 < 0.65) return null;
  const span = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx) - Math.min(rH[0].idx, rL[0].idx);
  if (span < 18) return null;
  const lastClose = slice[slice.length - 1].close;
  const nearness = lastClose / maxH;
  if (nearness < 0.92) return null;
  const flatScore = Math.round((2.5 - spread) / 2.5 * 40);
  const slopeScore = Math.round(Math.min(lowLine.r2 * 30, 30));
  const nearScore = nearness > 0.97 ? 25 : nearness > 0.94 ? 15 : 8;
  const confidence = Math.min(flatScore + slopeScore + nearScore, 95);
  if (confidence < 55) return null;
  return {
    name: "Ascending Triangle", icon: "🔺", confidence, color: "sky",
    description: `Resistance: ₹${minH.toFixed(0)}–₹${maxH.toFixed(0)} (${spread.toFixed(1)}% spread) · Rising lows (R²=${(lowLine.r2*100).toFixed(0)}%) · Price at ${(nearness*100).toFixed(1)}% of resistance`,
  };
}

function detectDoubleBottom(bars) {
  if (bars.length < 45) return null;
  const lookback = Math.min(90, bars.length - 6);
  const slice = bars.slice(-lookback);
  const sLows = findSwingLows(slice, 6), sHighs = findSwingHighs(slice, 4);
  if (sLows.length < 2 || sHighs.length < 1) return null;
  const recentL = sLows.slice(-5);
  for (let i = 0; i < recentL.length - 1; i++) {
    for (let j = i + 1; j < recentL.length; j++) {
      const L1 = recentL[i], L2 = recentL[j];
      if (L2.idx - L1.idx < 10) continue;
      const diff = Math.abs(L1.val - L2.val) / L1.val * 100;
      if (diff > 3) continue;
      if (L2.val < L1.val * 0.975) continue;
      const between = sHighs.filter(h => h.idx > L1.idx && h.idx < L2.idx);
      if (between.length === 0) continue;
      const neckline = Math.max(...between.map(h => h.val));
      const lift = (neckline - L1.val) / L1.val * 100;
      if (lift < 5) continue;
      const lastClose = slice[slice.length - 1].close;
      const aboveNeck = lastClose > neckline;
      const recovery = Math.min(((lastClose - L2.val) / (neckline - L2.val)) * 100, 120);
      if (recovery < 45) continue;
      const symScore = Math.round((3 - diff) / 3 * 35);
      const neckScore = Math.round(Math.min(lift * 2, 30));
      const recScore = aboveNeck ? 30 : Math.round(Math.min(recovery * 0.25, 25));
      const confidence = Math.min(symScore + neckScore + recScore, 95);
      if (confidence < 55) continue;
      return {
        name: "Double Bottom", icon: "🔁", confidence, color: "cyan",
        description: `Lows: ₹${L1.val.toFixed(0)} & ₹${L2.val.toFixed(0)} (${diff.toFixed(1)}% apart) · Neckline: ₹${neckline.toFixed(0)} (+${lift.toFixed(1)}%) · ${aboveNeck ? "✓ Above neckline" : `Recovery: ${recovery.toFixed(0)}%`}`,
      };
    }
  }
  return null;
}

function detectCupHandle(bars) {
  if (bars.length < 55) return null;
  const lookback = Math.min(90, bars.length - 6);
  const slice = bars.slice(-lookback);
  const cupLen = Math.floor(lookback * 0.70);
  const cupSlice = slice.slice(0, cupLen), hndSlice = slice.slice(cupLen);
  if (cupLen < 25 || hndSlice.length < 5) return null;
  const leftRim  = cupSlice.slice(0, 5).reduce((s, b) => s + b.close, 0) / 5;
  const rightRim = cupSlice.slice(-5).reduce((s, b) => s + b.close, 0) / 5;
  const rimDiff  = Math.abs(leftRim - rightRim) / leftRim * 100;
  if (rimDiff > 6) return null;
  const rimLevel = (leftRim + rightRim) / 2;
  const cupBot = Math.min(...cupSlice.map(b => b.low));
  const depth = (rimLevel - cupBot) / rimLevel * 100;
  if (depth < 12) return null;
  const midStart = Math.floor(cupLen * 0.30), midEnd = Math.floor(cupLen * 0.70);
  const midSlice = cupSlice.slice(midStart, midEnd);
  const midRange = (Math.max(...midSlice.map(b => b.high)) - Math.min(...midSlice.map(b => b.low))) / cupBot * 100;
  if (midRange > depth * 0.60) return null;
  const hndHigh = Math.max(...hndSlice.map(b => b.high)), hndLow = Math.min(...hndSlice.map(b => b.low));
  const hndRange = (hndHigh - hndLow) / hndHigh * 100;
  if (hndRange > 10) return null;
  const hndDrop = (rightRim - hndLow) / rightRim * 100;
  if (hndDrop > 9) return null;
  const lastClose = slice[slice.length - 1].close;
  const nearRim = lastClose / rightRim;
  if (nearRim < 0.94) return null;
  const symScore  = Math.round((6 - rimDiff) / 6 * 30);
  const depScore  = Math.round(Math.min(depth * 1.5, 30));
  const hndScore  = Math.round((10 - hndRange) * 2.5);
  const rimScore  = nearRim > 1.0 ? 15 : nearRim > 0.97 ? 10 : 5;
  const confidence = Math.min(symScore + depScore + hndScore + rimScore, 95);
  if (confidence < 55) return null;
  return {
    name: "Cup & Handle", icon: "☕", confidence, color: "orange",
    description: `Cup depth: ${depth.toFixed(1)}% · Rim symmetry: ${(100-rimDiff).toFixed(0)}% · Handle: ${hndRange.toFixed(1)}% range · Price at ${(nearRim*100).toFixed(0)}% of rim`,
  };
}

function detectRisingWedge(bars) {
  if (bars.length < 45) return null;
  const lookback = Math.min(65, bars.length - 6);
  const slice = bars.slice(-lookback);
  const sHighs = findSwingHighs(slice, 5), sLows = findSwingLows(slice, 5);
  if (sHighs.length < 3 || sLows.length < 3) return null;
  const rH = sHighs.slice(-4), rL = sLows.slice(-4);
  const highLine = linReg(rH.map(s => ({ x: s.idx, y: s.val })));
  const lowLine  = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (highLine.slope <= 0 || lowLine.slope <= 0) return null;
  if (lowLine.slope <= highLine.slope * 1.1) return null;
  if (highLine.r2 < 0.65 || lowLine.r2 < 0.65) return null;
  const xFirst = Math.min(rH[0].idx, rL[0].idx), xLast = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  const wStart = highLine.yAtX(xFirst) - lowLine.yAtX(xFirst);
  const wEnd   = highLine.yAtX(xLast)  - lowLine.yAtX(xLast);
  if (wStart <= 0 || wEnd <= 0 || wEnd >= wStart) return null;
  const compression = 1 - wEnd / wStart;
  if (compression < 0.30 || xLast - xFirst < 15) return null;
  const r2Avg = (highLine.r2 + lowLine.r2) / 2;
  const confidence = Math.round(Math.min(
    r2Avg * 35 + compression * 35 + Math.min((rH.length + rL.length - 4) * 5, 25), 95
  ));
  if (confidence < 55) return null;
  return {
    name: "Rising Wedge", icon: "⚠️", confidence, color: "amber",
    description: `Bearish · ${rH.length} swing highs · ${rL.length} swing lows · Compression: ${(compression*100).toFixed(0)}% · Fit: ${(r2Avg*100).toFixed(0)}%`,
  };
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────
async function fetchChart(symbol) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${symbol}?interval=1d&range=9mo&includePrePost=false`;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
    if (!resp.ok) return [];
    const json = await resp.json();
    const result = json.chart?.result?.[0];
    if (!result?.timestamp || !result.indicators?.quote?.[0]) return [];
    const { open, high, low, close, volume } = result.indicators.quote[0];
    return result.timestamp.map((ts, i) => ({
      open: open[i] ?? 0, high: high[i] ?? 0, low: low[i] ?? 0,
      close: close[i] ?? 0, volume: volume[i] ?? 0, timestamp: ts,
    })).filter(b => b.close > 0 && b.high > 0 && b.low > 0);
  } catch { return []; }
}

async function batchQuote(syms) {
  const url = `${YAHOO_BASE}/v8/finance/spark?symbols=${syms.join(",")}&range=1d&interval=5m`;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return new Map();
    const json = await resp.json();
    const map = new Map();
    for (const d of Object.values(json)) {
      if (d?.close?.length > 0) {
        const price = d.close[d.close.length - 1] ?? d.previousClose;
        map.set(d.symbol, {
          price, name: d.shortName ?? d.symbol,
          changePct: d.previousClose > 0 ? ((price - d.previousClose) / d.previousClose) * 100 : 0,
        });
      }
    }
    return map;
  } catch { return new Map(); }
}

async function batchQuoteAll(symbols) {
  const all = new Map();
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  for (let i = 0; i < chunks.length; i += 6) {
    const maps = await Promise.all(chunks.slice(i, i + 6).map(batchQuote));
    for (const m of maps) for (const [k, v] of m) all.set(k, v);
    if (i + 6 < chunks.length) await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

function getUniverse(universe, customSymbols) {
  if (universe === "nifty50") return NIFTY50;
  if (universe === "nifty100") return NIFTY100;
  if (universe === "nifty500") return NIFTY500;
  if (universe === "custom") return customSymbols.length > 0 ? customSymbols : NIFTY50;
  return NIFTY100;
}

function calcRsi(closes) {
  if (closes.length < 15) return 50;
  const ch = closes.slice(1).map((p, i) => p - closes[i]).slice(-14);
  const g = ch.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
  const l = Math.abs(ch.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    universe = "nifty50",
    symbols: customSymbols = [],
    patterns: selectedPatterns = ["bullFlag","fallingWedge","ascendingTriangle","doubleBottom","cupHandle","risingWedge"],
    minConfidence = 55,
    maxSymbols = 80,
  } = req.body ?? {};

  try {
    const allSymbols = getUniverse(universe, customSymbols);
    const quoteMap = await batchQuoteAll(allSymbols);

    const ranked = [...quoteMap.entries()]
      .sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct))
      .slice(0, Math.min(maxSymbols, allSymbols.length))
      .map(([sym]) => sym);

    const detectors = {
      bullFlag: detectBullFlag,
      fallingWedge: detectFallingWedge,
      ascendingTriangle: detectAscendingTriangle,
      doubleBottom: detectDoubleBottom,
      cupHandle: detectCupHandle,
      risingWedge: detectRisingWedge,
    };

    const matches = [];
    for (let i = 0; i < ranked.length; i += 6) {
      const settled = await Promise.allSettled(ranked.slice(i, i + 6).map(async symbol => {
        const bars = await fetchChart(symbol);
        if (bars.length < 45) return null;
        const closes = bars.map(b => b.close);
        const volumes = bars.map(b => b.volume);
        const rsi = calcRsi(closes);
        const avg20v = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
        const volRatio = avg20v > 0 ? volumes[volumes.length - 1] / avg20v : 1;
        const found = [];
        for (const key of selectedPatterns) {
          if (!detectors[key]) continue;
          const r = detectors[key](bars);
          if (r && r.confidence >= minConfidence) found.push(r);
        }
        if (found.length === 0) return null;
        const q = quoteMap.get(symbol) ?? { price: closes[closes.length-1], changePct: 0, name: symbol };
        return {
          symbol, name: q.name ?? symbol,
          price: +q.price.toFixed(2), changePct: +q.changePct.toFixed(2),
          rsi: +rsi.toFixed(1), volumeRatio: +volRatio.toFixed(2),
          volume: Math.round(volumes[volumes.length - 1]), avgVolume20: Math.round(avg20v),
          patterns: found.sort((a, b) => b.confidence - a.confidence),
          topPattern: found[0].name, topConfidence: found[0].confidence,
        };
      }));
      for (const r of settled) {
        if (r.status === "fulfilled" && r.value) matches.push(r.value);
      }
    }

    matches.sort((a, b) => b.topConfidence - a.topConfidence || b.patterns.length - a.patterns.length);

    return res.status(200).json({
      matches, scannedAt: new Date().toISOString(),
      totalScanned: ranked.length, totalMatched: matches.length,
      universe, note: "v2 — swing-point based detection",
    });
  } catch (err) {
    console.error("India pattern scan error:", err);
    return res.status(500).json({ error: err.message ?? "Scan failed" });
  }
}
