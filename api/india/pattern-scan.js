// Vercel Serverless: /api/india/pattern-scan — v3 (strict swing-point rules)

const YAHOO_BASE = "https://query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── NSE Universes ─────────────────────────────────────────────────────────────
const N50 = [
  "RELIANCE","TCS","HDFCBANK","BHARTIARTL","ICICIBANK","INFOSYS","SBIN","HINDUNILVR","LICI",
  "ITC","KOTAKBANK","LT","M&M","AXISBANK","BAJFINANCE","HCLTECH","TITAN","ASIANPAINT","WIPRO",
  "NESTLEIND","ULTRACEMCO","MARUTI","SUNPHARMA","INDUSINDBK","NTPC","POWERGRID","BAJAJFINSV",
  "TECHM","JSWSTEEL","ADANIENT","ADANIGREEN","ADANIPORTS","DIVISLAB","COALINDIA","CIPLA",
  "ONGC","BPCL","BRITANNIA","EICHERMOT","TATACONSUM","GRASIM","HEROMOTOCO","HINDALCO",
  "SBILIFE","DRREDDY","HDFCLIFE","APOLLOHOSP","BAJAJ-AUTO","TATAMOTORS","TATASTEEEL",
].map(s => `${s}.NS`);

const N100_EXTRA = [
  "SIEMENS","ABB","HAVELLS","PIDILITIND","BERGEPAINT","DABUR","MARICO","COLPAL","MCDOWELL-N",
  "LUPIN","TORNTPHARM","BIOCON","ALKEM","AMBUJACEM","SHREECEM","GAIL","IOC","HINDPETRO",
  "VEDL","HINDZINC","NATIONALUM","NMDC","SAIL","JSWENERGY","TATAPOWER","ADANIPOWER",
  "ATGL","CANBK","BANKBARODA","PNB","UNIONBANK","IDFC","BANDHANBNK","MUTHOOTFIN","CHOLAFIN",
  "BAJAJHLDNG","LICHSGFIN","PFC","RECLTD","IRFC","ZOMATO","NYKAA","PAYTM","DMART",
  "TRENT","CAMS","CDSL","BSE","MCX","IRCTC","INDIANB","FEDERALBNK","IDFCFIRSTB","AUBANK",
].map(s => `${s}.NS`);

const N500_EXTRA = [
  "AAVAS","ABCAPITAL","ABFRL","APLAPOLLO","ASTRAL","BALKRISIND","BATAINDIA","BLUEDART","CEATLTD",
  "CENTURYTEX","CESC","CHAMBLFERT","CONCOR","COROMANDEL","CROMPTON","CUMMINSIND","DCB",
  "DEEPAKNI","DELTACORP","DIXON","ELGIEQUIP","EMAMILTD","ENGINERSIN","EQUITASBNK","ESCORTS",
  "EXIDEIND","GALAXYSURF","GNFC","GODREJAGRO","GODREJCP","GODREJIND","GODREJPROP","GRANULES",
  "GRINDWELL","GSFC","GUJALKALI","GULFINDS","HAPPSTMNDS","HDFCAMC","HINDCOPPER","HONAUT",
  "IBREALEST","IBULHSGFIN","INDHOTEL","INDOCO","INTELLECT","IPCALAB","JKCEMENT","JKLAKSHMI",
  "JKPAPER","JKTYRE","JUBLFOOD","JUBLINGREA","KAJARIACER","KEC","KIMS","KPITTECH","LALPATHLAB",
  "LAXMIMACH","LINDEINDIA","LTTS","LUXIND","MAHINDCIE","MANAPPURAM","MASFIN","MAXHEALTH",
  "METROPOLIS","MPHASIS","MRF","NATCOPHARM","NAVINFLUOR","NBCC","NESCO","NIACL","NLCINDIA",
  "NMDC","NOCIL","AARTIIND","PERSISTENT","PFIZER","PHOENIXLTD","PRESTIGE","PRINCEPIPES",
  "RADICO","RAMCOCEM","RAYMOND","REDINGTON","RELAXO","RITES","ROSSARI","SAFARI","SAREGAMA",
  "SCHAEFFLER","SJVN","SKFINDIA","SONACOMS","SRTRANSFIN","STAR","SUDARSCHEM","SUVENPHAR",
  "SYMPHONY","TANLA","TATACHEM","TATACOFFEE","TATAELXSI","TATAINVEST","TEAMLEASE","THERMAX",
  "TIMKEN","TITAGARH","TTKPRESTIG","UCOBANK","UJJIVANSFB","UTIAMC","VAIBHAVGBL","VGUARD",
  "VINATIORGA","VMART","VOLTAS","VSTIND","WHIRLPOOL","WOCKPHARMA","ZYDUSLIFE",
].map(s => `${s}.NS`);

const N100  = [...new Set([...N50, ...N100_EXTRA])];
const N500  = [...new Set([...N100, ...N500_EXTRA])];

// ── Math helpers ──────────────────────────────────────────────────────────────
function linReg(pts) {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: pts[0]?.y ?? 0, r2: 0, at: x => pts[0]?.y ?? 0 };
  const xm = pts.reduce((s, p) => s + p.x, 0) / n;
  const ym = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0, tot = 0;
  for (const { x, y } of pts) { num += (x - xm) * (y - ym); den += (x - xm) ** 2; tot += (y - ym) ** 2; }
  const slope = den ? num / den : 0;
  const int   = ym - slope * xm;
  const res   = pts.reduce((s, { x, y }) => s + (y - (slope * x + int)) ** 2, 0);
  const r2    = tot > 0 ? Math.max(0, 1 - res / tot) : 0;
  return { slope, intercept: int, r2, at: x => slope * x + int };
}

function swingHighs(bars, window = 6) {
  const out = [];
  for (let i = window; i < bars.length - window; i++) {
    const h = bars[i].high;
    let ok = true;
    for (let j = i - window; j <= i + window; j++) { if (j !== i && bars[j].high >= h) { ok = false; break; } }
    if (ok) out.push({ idx: i, val: h });
  }
  return out;
}

function swingLows(bars, window = 6) {
  const out = [];
  for (let i = window; i < bars.length - window; i++) {
    const l = bars[i].low;
    let ok = true;
    for (let j = i - window; j <= i + window; j++) { if (j !== i && bars[j].low <= l) { ok = false; break; } }
    if (ok) out.push({ idx: i, val: l });
  }
  return out;
}

function isStrictlyDecreasing(arr, minPct = 0) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].val >= arr[i - 1].val) return false;
    if (minPct > 0 && (arr[i - 1].val - arr[i].val) / arr[i - 1].val * 100 < minPct) return false;
  }
  return true;
}

function isStrictlyIncreasing(arr, minPct = 0) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].val <= arr[i - 1].val) return false;
    if (minPct > 0 && (arr[i].val - arr[i - 1].val) / arr[i - 1].val * 100 < minPct) return false;
  }
  return true;
}

// ── Pattern detectors v3 (same strict logic, INR formatting in descriptions) ─

function detectFallingWedge(bars) {
  if (bars.length < 50) return null;
  const slice = bars.slice(-65), n = slice.length;
  const sH = swingHighs(slice, 6), sL = swingLows(slice, 6);
  if (sH.length < 3 || sL.length < 3) return null;
  const rH = sH.slice(-4), rL = sL.slice(-4);
  if (!isStrictlyDecreasing(rH, 1.5)) return null;
  if (!isStrictlyDecreasing(rL, 1.0)) return null;
  const highLine = linReg(rH.map(s => ({ x: s.idx, y: s.val })));
  const lowLine  = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (highLine.slope >= 0 || lowLine.slope >= 0) return null;
  if (highLine.slope >= lowLine.slope) return null;
  if (Math.abs(highLine.slope) < Math.abs(lowLine.slope) * 1.15) return null;
  if (highLine.r2 < 0.75 || lowLine.r2 < 0.75) return null;
  const xFirst = Math.min(rH[0].idx, rL[0].idx), xLast = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  const wStart = highLine.at(xFirst) - lowLine.at(xFirst), wEnd = highLine.at(xLast) - lowLine.at(xLast);
  if (wStart <= 0 || wEnd <= 0 || wEnd >= wStart) return null;
  const compression = 1 - wEnd / wStart;
  if (compression < 0.30 || xLast - xFirst < 15 || xLast - xFirst > 65) return null;
  const lastSwing = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  if (n - 1 - lastSwing > 18) return null;
  const lastClose = slice[n-1].close, curH = highLine.at(n-1), curL = lowLine.at(n-1);
  if (curH > curL && (lastClose - curL) / (curH - curL) > 1.3) return null;
  const r2Avg = (highLine.r2 + lowLine.r2) / 2;
  const confidence = Math.round(Math.min(r2Avg*30 + compression*35 + Math.min((rH.length+rL.length-4)*5,20) + 10, 95));
  if (confidence < 57) return null;
  return {
    name: "Falling Wedge", icon: "📐", confidence, color: "violet",
    description: `${rH.length} strictly lower highs + ${rL.length} strictly lower lows · Compression: ${(compression*100).toFixed(0)}% · Fit: ${(r2Avg*100).toFixed(0)}% · ${xLast-xFirst} bars`,
  };
}

function detectBullFlag(bars) {
  if (bars.length < 30) return null;
  const N = bars.length;
  for (let flagLen = 5; flagLen <= 18; flagLen++) {
    for (let poleLen = 5; poleLen <= 15; poleLen++) {
      const needed = poleLen + flagLen + 3;
      if (N < needed) continue;
      const poleStart = N - needed, poleEnd = poleStart + poleLen;
      const poleBars = bars.slice(poleStart, poleEnd), flagBars = bars.slice(poleEnd);
      const poleOpen = poleBars[0].close, poleClose = poleBars[poleBars.length-1].close;
      const poleGain = (poleClose - poleOpen) / poleOpen * 100;
      if (poleGain < 10) continue;
      const poleFloor = poleOpen + (poleClose - poleOpen) * 0.25;
      if (poleBars.some(b => b.close < poleFloor)) continue;
      let peak = poleOpen, maxDD = 0;
      for (const b of poleBars) { peak = Math.max(peak, b.high); maxDD = Math.max(maxDD, (peak - b.low) / peak * 100); }
      if (maxDD > 6) continue;
      const fHighs = flagBars.map(b => b.high), fLows = flagBars.map(b => b.low);
      const fMax = Math.max(...fHighs), fMin = Math.min(...fLows), fRange = (fMax - fMin) / fMax * 100;
      if (fRange > 6) continue;
      const poleH = poleClose - poleOpen, pullback = poleClose - Math.min(...flagBars.map(b => b.close));
      if (pullback > poleH * 0.50) continue;
      const hReg = linReg(fHighs.map((h, i) => ({ x: i, y: h }))), lReg = linReg(fLows.map((l, i) => ({ x: i, y: l })));
      if (Math.abs(hReg.slope - lReg.slope) > poleClose * 0.004) continue;
      if (hReg.slope > poleClose * 0.003 || lReg.slope > poleClose * 0.003) continue;
      const poleVol = poleBars.reduce((s, b) => s + b.volume, 0) / poleLen;
      const flagVol = flagBars.reduce((s, b) => s + b.volume, 0) / flagLen;
      const volOK = flagVol < poleVol * 0.80;
      const confidence = Math.round(Math.min(
        Math.min(poleGain*2.5, 40) + Math.max(0,(6-fRange)*5) + (volOK?20:5) + Math.max(0,(0.5-pullback/poleH)*20), 95
      ));
      if (confidence < 57) continue;
      return {
        name: "Bull Flag", icon: "🏳️", confidence, color: "emerald",
        description: `Pole: +${poleGain.toFixed(1)}% (${poleLen} bars) · Flag: ${fRange.toFixed(1)}% range · Pullback: ${(pullback/poleH*100).toFixed(0)}% · Vol: ${volOK?"contracting ✓":"not contracting"}`,
      };
    }
  }
  return null;
}

function detectAscendingTriangle(bars) {
  if (bars.length < 45) return null;
  const slice = bars.slice(-70), n = slice.length;
  const sH = swingHighs(slice, 4), sL = swingLows(slice, 4);
  if (sH.length < 3 || sL.length < 3) return null;
  const rH = sH.slice(-5), rL = sL.slice(-5);
  const maxH = Math.max(...rH.map(s => s.val)), minH = Math.min(...rH.map(s => s.val));
  const spread = (maxH - minH) / maxH * 100;
  if (spread > 2.0) return null;
  if (!isStrictlyIncreasing(rL, 0.5)) return null;
  const lowLine = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (lowLine.slope <= 0 || lowLine.r2 < 0.70) return null;
  const xFirst = Math.min(rH[0].idx, rL[0].idx), xLast = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  if (xLast - xFirst < 20 || n - 1 - xLast > 15) return null;
  const lastClose = slice[n-1].close, nearness = lastClose / maxH;
  if (nearness < 0.93 || nearness > 1.03) return null;
  const flatScore = Math.round((2.0 - spread) / 2.0 * 40);
  const slopeScore = Math.round(Math.min(lowLine.r2 * 30, 30));
  const nearScore = nearness > 0.98 ? 25 : nearness > 0.95 ? 15 : 8;
  const confidence = Math.min(flatScore + slopeScore + nearScore, 95);
  if (confidence < 57) return null;
  return {
    name: "Ascending Triangle", icon: "🔺", confidence, color: "sky",
    description: `Resistance: ₹${minH.toFixed(0)}–₹${maxH.toFixed(0)} (${spread.toFixed(1)}%) · ${rL.length} rising lows (R²=${(lowLine.r2*100).toFixed(0)}%) · Price at ${(nearness*100).toFixed(1)}% of resistance`,
  };
}

function detectDoubleBottom(bars) {
  if (bars.length < 50) return null;
  const slice = bars.slice(-85), n = slice.length;
  const sL = swingLows(slice, 7), sH = swingHighs(slice, 4);
  if (sL.length < 2 || sH.length < 1) return null;
  const recentL = sL.slice(-6);
  for (let i = 0; i < recentL.length - 1; i++) {
    for (let j = i + 1; j < recentL.length; j++) {
      const L1 = recentL[i], L2 = recentL[j];
      const sep = L2.idx - L1.idx;
      if (sep < 15 || sep > 55) continue;
      if (n - 1 - L2.idx > 25) continue;  // L2 must be RECENT ← KEY CHECK
      const diff = Math.abs(L1.val - L2.val) / L1.val * 100;
      if (diff > 2.5) continue;
      if (L2.val < L1.val * 0.975) continue;
      const preStart = Math.max(0, L1.idx - 30), preEnd = Math.max(0, L1.idx - 5);
      if (preEnd <= preStart) continue;
      const preAvg = slice.slice(preStart, preEnd).reduce((s, b) => s + b.close, 0) / (preEnd - preStart);
      const drawdownPct = (preAvg - L1.val) / preAvg * 100;
      if (drawdownPct < 10) continue;
      const between = sH.filter(h => h.idx > L1.idx && h.idx < L2.idx);
      if (!between.length) continue;
      const neckline = Math.max(...between.map(h => h.val));
      const lift = (neckline - L1.val) / L1.val * 100;
      if (lift < 8) continue;
      const lastClose = slice[n-1].close;
      const aboveNeck = lastClose > neckline;
      const recovery = Math.min(((lastClose - L2.val) / (neckline - L2.val)) * 100, 120);
      if (recovery < 55) continue;
      const symScore = Math.round((2.5 - diff) / 2.5 * 35);
      const neckScore = Math.round(Math.min(lift * 2, 30));
      const recScore = aboveNeck ? 30 : Math.round(Math.min(recovery * 0.27, 26));
      const confidence = Math.min(symScore + neckScore + recScore, 95);
      if (confidence < 57) continue;
      return {
        name: "Double Bottom", icon: "🔁", confidence, color: "cyan",
        description: `Lows: ₹${L1.val.toFixed(0)} & ₹${L2.val.toFixed(0)} (${diff.toFixed(1)}% apart) · Neckline: ₹${neckline.toFixed(0)} (+${lift.toFixed(1)}%) · ${aboveNeck?"✓ Above neckline":`Recovery: ${recovery.toFixed(0)}%`} · Prior decline: ${drawdownPct.toFixed(0)}%`,
      };
    }
  }
  return null;
}

function detectCupHandle(bars) {
  if (bars.length < 60) return null;
  const lookback = Math.min(90, bars.length - 6);
  const slice = bars.slice(-lookback), n = slice.length;
  const cupLen = Math.floor(n * 0.70), cupSlice = slice.slice(0, cupLen), hndSlice = slice.slice(cupLen);
  if (cupLen < 25 || hndSlice.length < 5) return null;
  const lW = Math.max(3, Math.ceil(cupLen * 0.15)), rW = Math.max(3, Math.ceil(cupLen * 0.15));
  const leftRim  = Math.max(...cupSlice.slice(0, lW).map(b => b.close));
  const rightRim = Math.max(...cupSlice.slice(-rW).map(b => b.close));
  const rimDiff  = Math.abs(leftRim - rightRim) / leftRim * 100;
  if (rimDiff > 5) return null;
  const rimLevel = (leftRim + rightRim) / 2;
  const midS = Math.floor(cupLen * 0.30), midE = Math.floor(cupLen * 0.70);
  const midSlc = cupSlice.slice(midS, midE);
  const cupBot = Math.min(...midSlc.map(b => b.low));
  const depth  = (rimLevel - cupBot) / rimLevel * 100;
  if (depth < 12) return null;
  const midH = Math.max(...midSlc.map(b => b.high));
  if ((midH - cupBot) / rimLevel * 100 > depth * 0.55) return null;
  const leftAvg = cupSlice.slice(0, lW).reduce((s, b) => s + b.close, 0) / lW;
  const midAvg  = midSlc.reduce((s, b) => s + b.close, 0) / midSlc.length;
  if (midAvg > leftAvg * 0.88) return null;
  const hndH = Math.max(...hndSlice.map(b => b.high)), hndL = Math.min(...hndSlice.map(b => b.low));
  const hndRng = (hndH - hndL) / hndH * 100;
  if (hndRng > 10) return null;
  if (hndL < (rimLevel + cupBot) / 2) return null;
  if ((rightRim - hndL) / rightRim * 100 > 8) return null;
  const hndReg = linReg(hndSlice.map((b, i) => ({ x: i, y: b.high })));
  if (hndReg.slope > rightRim * 0.003) return null;
  const lastClose = slice[n-1].close, nearRim = lastClose / rightRim;
  if (nearRim < 0.95 || nearRim > 1.08) return null;
  const confidence = Math.min(
    Math.round((5-rimDiff)/5*30) + Math.round(Math.min(depth*1.5,30)) + Math.round((10-hndRng)*2.5) + (nearRim>1.0?15:nearRim>0.97?10:5),
    95
  );
  if (confidence < 57) return null;
  return {
    name: "Cup & Handle", icon: "☕", confidence, color: "orange",
    description: `Cup depth: ${depth.toFixed(1)}% · Rim match: ${(100-rimDiff).toFixed(0)}% · Handle: ${hndRng.toFixed(1)}% range · Price at ${(nearRim*100).toFixed(0)}% of rim`,
  };
}

function detectRisingWedge(bars) {
  if (bars.length < 50) return null;
  const slice = bars.slice(-65), n = slice.length;
  const sH = swingHighs(slice, 6), sL = swingLows(slice, 6);
  if (sH.length < 3 || sL.length < 3) return null;
  const rH = sH.slice(-4), rL = sL.slice(-4);
  if (!isStrictlyIncreasing(rH, 1.5)) return null;
  if (!isStrictlyIncreasing(rL, 1.0)) return null;
  const highLine = linReg(rH.map(s => ({ x: s.idx, y: s.val }))), lowLine = linReg(rL.map(s => ({ x: s.idx, y: s.val })));
  if (highLine.slope <= 0 || lowLine.slope <= 0) return null;
  if (lowLine.slope <= highLine.slope * 1.15) return null;
  if (highLine.r2 < 0.75 || lowLine.r2 < 0.75) return null;
  const xFirst = Math.min(rH[0].idx, rL[0].idx), xLast = Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx);
  const wStart = highLine.at(xFirst) - lowLine.at(xFirst), wEnd = highLine.at(xLast) - lowLine.at(xLast);
  if (wStart <= 0 || wEnd <= 0 || wEnd >= wStart) return null;
  const compression = 1 - wEnd / wStart;
  if (compression < 0.30 || xLast - xFirst < 15) return null;
  if (n - 1 - Math.max(rH[rH.length-1].idx, rL[rL.length-1].idx) > 18) return null;
  const r2Avg = (highLine.r2 + lowLine.r2) / 2;
  const confidence = Math.round(Math.min(r2Avg*30 + compression*35 + Math.min((rH.length+rL.length-4)*5,20) + 10, 95));
  if (confidence < 57) return null;
  return {
    name: "Rising Wedge", icon: "⚠️", confidence, color: "amber",
    description: `Bearish · ${rH.length} strictly higher highs + ${rL.length} strictly higher lows · Compression: ${(compression*100).toFixed(0)}% · Fit: ${(r2Avg*100).toFixed(0)}%`,
  };
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────
async function fetchChart(symbol) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${symbol}?interval=1d&range=9mo&includePrePost=false`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const j = await r.json();
    const res = j.chart?.result?.[0];
    if (!res?.timestamp || !res.indicators?.quote?.[0]) return [];
    const { open, high, low, close, volume } = res.indicators.quote[0];
    return res.timestamp.map((ts, i) => ({
      open: open[i]??0, high: high[i]??0, low: low[i]??0, close: close[i]??0, volume: volume[i]??0,
    })).filter(b => b.close > 0 && b.high > 0 && b.low > 0);
  } catch { return []; }
}

async function batchQuote(syms) {
  const url = `${YAHOO_BASE}/v8/finance/spark?symbols=${syms.join(",")}&range=1d&interval=5m`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return new Map();
    const j = await r.json();
    const map = new Map();
    for (const d of Object.values(j)) {
      if (d?.close?.length > 0) {
        const price = d.close[d.close.length-1] ?? d.previousClose ?? 0;
        map.set(d.symbol, {
          price, name: d.shortName ?? d.symbol,
          changePct: d.previousClose > 0 ? (price - d.previousClose) / d.previousClose * 100 : 0,
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

function universe(u, custom) {
  if (u === "nifty50")  return N50;
  if (u === "nifty100") return N100;
  if (u === "nifty500") return N500;
  if (u === "custom")   return custom.length ? custom : N50;
  return N100;
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
    universe: u   = "nifty50",
    symbols: sym  = [],
    patterns: sel = ["bullFlag","fallingWedge","ascendingTriangle","doubleBottom","cupHandle","risingWedge"],
    minConfidence = 57,
    maxSymbols    = 80,
  } = req.body ?? {};

  try {
    const syms   = universe(u, sym);
    const qmap   = await batchQuoteAll(syms);
    const ranked = [...qmap.entries()]
      .sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct))
      .slice(0, Math.min(maxSymbols, syms.length))
      .map(([s]) => s);

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
        if (bars.length < 50) return null;
        const closes  = bars.map(b => b.close);
        const volumes = bars.map(b => b.volume);
        const rsi   = calcRsi(closes);
        const avg20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
        const volRatio = avg20 > 0 ? volumes[volumes.length-1] / avg20 : 1;

        const found = [];
        for (const key of sel) {
          if (!detectors[key]) continue;
          try {
            const r = detectors[key](bars);
            if (r && r.confidence >= minConfidence) found.push(r);
          } catch { /* skip */ }
        }
        if (!found.length) return null;

        const q = qmap.get(symbol) ?? { price: closes[closes.length-1], changePct: 0, name: symbol };
        return {
          symbol, name: q.name ?? symbol,
          price: +q.price.toFixed(2), changePct: +q.changePct.toFixed(2),
          rsi: +rsi.toFixed(1), volumeRatio: +volRatio.toFixed(2),
          volume: Math.round(volumes[volumes.length-1]), avgVolume20: Math.round(avg20),
          patterns: found.sort((a, b) => b.confidence - a.confidence),
          topPattern: found[0].name, topConfidence: found[0].confidence,
        };
      }));
      for (const r of settled) if (r.status === "fulfilled" && r.value) matches.push(r.value);
    }

    matches.sort((a, b) => b.topConfidence - a.topConfidence || b.patterns.length - a.patterns.length);

    return res.status(200).json({
      matches, scannedAt: new Date().toISOString(),
      totalScanned: ranked.length, totalMatched: matches.length,
      universe: u, version: "v3-strict",
    });
  } catch (err) {
    console.error("India pattern-scan error:", err);
    return res.status(500).json({ error: err.message ?? "Scan failed" });
  }
}
