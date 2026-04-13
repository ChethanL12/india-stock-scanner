// Vercel Serverless Function: /api/india/pattern-scan

const YAHOO_BASE = "https://query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── India Stock Universes (.NS suffix for Yahoo Finance) ──────────────────────
const NIFTY50_SYMBOLS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","HINDUNILVR.NS","ICICIBANK.NS",
  "KOTAKBANK.NS","BHARTIARTL.NS","ITC.NS","SBIN.NS","BAJFINANCE.NS","LICI.NS",
  "LT.NS","HCLTECH.NS","AXISBANK.NS","ASIANPAINT.NS","MARUTI.NS","SUNPHARMA.NS",
  "TITAN.NS","ULTRACEMCO.NS","WIPRO.NS","ONGC.NS","NESTLEIND.NS","POWERGRID.NS",
  "NTPC.NS","TECHM.NS","TATAMOTORS.NS","TATASTEEL.NS","ADANIENT.NS","ADANIPORTS.NS",
  "JSWSTEEL.NS","BAJAJFINSV.NS","COALINDIA.NS","HDFCLIFE.NS","DIVISLAB.NS",
  "CIPLA.NS","APOLLOHOSP.NS","BPCL.NS","EICHERMOT.NS","HEROMOTOCO.NS",
  "SBILIFE.NS","BRITANNIA.NS","DRREDDY.NS","SHRIRAMFIN.NS","GRASIM.NS",
  "TATACONSUM.NS","M&M.NS","INDUSINDBK.NS","HINDALCO.NS","BEL.NS",
];

const NIFTY100_SYMBOLS = [
  ...NIFTY50_SYMBOLS,
  "SIEMENS.NS","PIDILITIND.NS","HAVELLS.NS","DABUR.NS","BERGEPAINT.NS","MARICO.NS",
  "LUPIN.NS","TORNTPHARM.NS","BOSCHLTD.NS","COLPAL.NS","MCDOWELL-N.NS","AMBUJACEM.NS",
  "ABB.NS","MUTHOOTFIN.NS","MOTHERSON.NS","CHOLAFIN.NS","TATAPOWER.NS","RECLTD.NS",
  "ZYDUSLIFE.NS","BAJAJ-AUTO.NS","TRENT.NS","DMART.NS","PAGEIND.NS","NAUKRI.NS",
  "BANKBARODA.NS","PNB.NS","CANBK.NS","UNIONBANK.NS","INDHOTEL.NS","IRCTC.NS",
  "HAL.NS","BHEL.NS","SAIL.NS","NHPC.NS","SJVN.NS","IRFC.NS","PFC.NS",
  "GMRINFRA.NS","OBEROIRLTY.NS","DLF.NS","PRESTIGE.NS","GODREJPROP.NS",
  "LODHA.NS","ABBOTINDIA.NS","AUROPHARMA.NS","ALKEM.NS","LALPATHLAB.NS","METROPOLIS.NS",
  "IPCALAB.NS","CONCOR.NS",
];

const NIFTY500_SYMBOLS = [
  ...NIFTY100_SYMBOLS,
  "PERSISTENT.NS","LTIM.NS","MPHASIS.NS","COFORGE.NS","KPITTECH.NS","LTTS.NS","OFSS.NS",
  "ZOMATO.NS","PAYTM.NS","NYKAA.NS","POLICYBZR.NS","DELHIVERY.NS","MAPMYINDIA.NS",
  "IXIGO.NS","ESCORTS.NS","BHARATFORG.NS","APOLLOTYRE.NS","BALKRISIND.NS","EXIDEIND.NS",
  "VBL.NS","UNITDSPR.NS","RADICO.NS","UBL.NS","JUBLFOOD.NS","DEVYANI.NS","WESTLIFE.NS",
  "SUPREMEIND.NS","ASTRAL.NS","POLYCAB.NS","KEI.NS","APLAPOLLO.NS","RATNAMANI.NS",
  "VOLTAS.NS","BLUESTARCO.NS","CROMPTON.NS","DIXON.NS","KAYNES.NS",
  "CDSL.NS","BSE.NS","MCX.NS","ANGELONE.NS","MOTILALOFS.NS","HDFCAMC.NS","NIPPONLIFE.NS",
  "ICICIPRULI.NS","STARHEALTH.NS","ADANIGREEN.NS","TATACOMM.NS","INDIAMART.NS",
  "AFFLE.NS","TORNTPOWER.NS","CESC.NS","JSPL.NS","HINDZINC.NS","VEDL.NS","NMDC.NS",
  "INTERGLOBE.NS","BLUEDART.NS","GLAND.NS","PFIZER.NS","MANKIND.NS","GLENMARK.NS",
  "JKCEMENT.NS","RAMCOCEM.NS","DALBHARAT.NS","CUMMINSIND.NS","THERMAX.NS",
  "FINCABLES.NS","RVNL.NS","RITES.NS","IRCON.NS","NBCC.NS","NCC.NS",
  "JSWENERGY.NS","WAAREEENER.NS","ROUTE.NS","JUSTDIAL.NS",
];

const COMPANY_NAMES = {
  "RELIANCE.NS":"Reliance Industries","TCS.NS":"Tata Consultancy Services",
  "HDFCBANK.NS":"HDFC Bank","INFY.NS":"Infosys","HINDUNILVR.NS":"Hindustan Unilever",
  "ICICIBANK.NS":"ICICI Bank","KOTAKBANK.NS":"Kotak Mahindra Bank",
  "BHARTIARTL.NS":"Bharti Airtel","ITC.NS":"ITC","SBIN.NS":"State Bank of India",
  "BAJFINANCE.NS":"Bajaj Finance","LICI.NS":"LIC India","LT.NS":"Larsen & Toubro",
  "HCLTECH.NS":"HCL Technologies","AXISBANK.NS":"Axis Bank",
  "ASIANPAINT.NS":"Asian Paints","MARUTI.NS":"Maruti Suzuki","SUNPHARMA.NS":"Sun Pharma",
  "TITAN.NS":"Titan Company","ULTRACEMCO.NS":"UltraTech Cement","WIPRO.NS":"Wipro",
  "ONGC.NS":"ONGC","NESTLEIND.NS":"Nestle India","POWERGRID.NS":"Power Grid Corp",
  "NTPC.NS":"NTPC","TECHM.NS":"Tech Mahindra","TATAMOTORS.NS":"Tata Motors",
  "TATASTEEL.NS":"Tata Steel","ADANIENT.NS":"Adani Enterprises","ADANIPORTS.NS":"Adani Ports",
  "JSWSTEEL.NS":"JSW Steel","BAJAJFINSV.NS":"Bajaj Finserv","COALINDIA.NS":"Coal India",
  "HDFCLIFE.NS":"HDFC Life Insurance","DIVISLAB.NS":"Divi's Laboratories",
  "CIPLA.NS":"Cipla","APOLLOHOSP.NS":"Apollo Hospitals","BPCL.NS":"BPCL",
  "EICHERMOT.NS":"Eicher Motors","HEROMOTOCO.NS":"Hero MotoCorp",
  "SBILIFE.NS":"SBI Life Insurance","BRITANNIA.NS":"Britannia Industries",
  "DRREDDY.NS":"Dr Reddy's Laboratories","SHRIRAMFIN.NS":"Shriram Finance",
  "GRASIM.NS":"Grasim Industries","TATACONSUM.NS":"Tata Consumer Products",
  "M&M.NS":"Mahindra & Mahindra","INDUSINDBK.NS":"IndusInd Bank",
  "HINDALCO.NS":"Hindalco Industries","BEL.NS":"Bharat Electronics",
  "ZOMATO.NS":"Zomato","HAL.NS":"Hindustan Aeronautics",
  "RVNL.NS":"Rail Vikas Nigam","IRFC.NS":"Indian Railway Finance",
  "PFC.NS":"Power Finance Corp","RECLTD.NS":"REC Limited","CDSL.NS":"CDSL","BSE.NS":"BSE",
};

function getName(symbol) {
  return COMPANY_NAMES[symbol] || symbol.replace(".NS", "");
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function linReg(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean);
    den += (i - xMean) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

function swingLows(lows, window = 3) {
  const out = [];
  for (let i = window; i < lows.length - window; i++) {
    const slice = lows.slice(i - window, i + window + 1);
    if (lows[i] === Math.min(...slice)) out.push({ idx: i, val: lows[i] });
  }
  return out;
}

function swingHighs(highs, window = 3) {
  const out = [];
  for (let i = window; i < highs.length - window; i++) {
    const slice = highs.slice(i - window, i + window + 1);
    if (highs[i] === Math.max(...slice)) out.push({ idx: i, val: highs[i] });
  }
  return out;
}

// ── Pattern Detectors (same algorithms as US version) ─────────────────────────
function detectBullFlag(bars) {
  if (bars.length < 25) return null;
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  for (let consLen = 5; consLen <= 20; consLen++) {
    for (let poleLen = 5; poleLen <= 15; poleLen++) {
      const totalNeed = poleLen + consLen;
      if (bars.length < totalNeed + 5) continue;
      const poleStart = bars.length - totalNeed - 1;
      const poleEnd = bars.length - consLen - 1;
      const consStart = poleEnd;
      const poleGain = (closes[poleEnd] - closes[poleStart]) / closes[poleStart] * 100;
      if (poleGain < 7) continue;
      const consPrices = closes.slice(consStart);
      const consHigh = Math.max(...consPrices);
      const consLow = Math.min(...consPrices);
      const consRange = (consHigh - consLow) / consHigh * 100;
      if (consRange > 8) continue;
      const consReg = linReg(consPrices);
      const flagDrift = (consReg.slope / closes[consStart]) * 100;
      if (flagDrift > 0.5) continue;
      const poleVol = volumes.slice(poleStart, poleEnd).reduce((a, b) => a + b, 0) / poleLen;
      const consVol = volumes.slice(consStart).reduce((a, b) => a + b, 0) / consLen;
      const volRatio = consVol > 0 ? poleVol / consVol : 1;
      const confidence = Math.round(Math.min(Math.min(poleGain * 4, 50) + Math.max(0, (8 - consRange) * 3) + Math.min(volRatio * 5, 20), 95));
      if (confidence < 50) continue;
      return { name: "Bull Flag", icon: "🏳️", confidence, description: `Pole: +${poleGain.toFixed(1)}% in ${poleLen} bars · Consolidation: ${consRange.toFixed(1)}% · Vol contraction: ${volRatio.toFixed(1)}x`, color: "emerald" };
    }
  }
  return null;
}

function detectFallingWedge(bars) {
  if (bars.length < 25) return null;
  const lookback = Math.min(40, bars.length - 2);
  const slice = bars.slice(-lookback);
  const highs = slice.map(b => b.high);
  const lows = slice.map(b => b.low);
  const highReg = linReg(highs);
  const lowReg = linReg(lows);
  if (highReg.slope >= 0 || lowReg.slope >= 0) return null;
  if (highReg.slope >= lowReg.slope) return null;
  const startWidth = highReg.intercept - lowReg.intercept;
  const endWidth = (highReg.slope * (lookback - 1) + highReg.intercept) - (lowReg.slope * (lookback - 1) + lowReg.intercept);
  if (startWidth <= 0 || endWidth <= 0) return null;
  const convergence = 1 - endWidth / startWidth;
  if (convergence < 0.25) return null;
  const lastClose = slice[slice.length - 1].close;
  const lastHigh = highReg.slope * (lookback - 1) + highReg.intercept;
  const lastLow = lowReg.slope * (lookback - 1) + lowReg.intercept;
  const position = (lastClose - lastLow) / (lastHigh - lastLow);
  const r2Score = (highReg.r2 + lowReg.r2) / 2;
  const confidence = Math.min(Math.round(convergence * 40) + Math.round(r2Score * 30) + Math.round(position * 25), 95);
  if (confidence < 45) return null;
  return { name: "Falling Wedge", icon: "📐", confidence, description: `Convergence: ${(convergence * 100).toFixed(0)}% · Fit: ${(r2Score * 100).toFixed(0)}% · Position: ${(position * 100).toFixed(0)}%`, color: "violet" };
}

function detectRisingWedge(bars) {
  if (bars.length < 25) return null;
  const lookback = Math.min(40, bars.length - 2);
  const slice = bars.slice(-lookback);
  const highReg = linReg(slice.map(b => b.high));
  const lowReg = linReg(slice.map(b => b.low));
  if (highReg.slope <= 0 || lowReg.slope <= 0) return null;
  if (lowReg.slope <= highReg.slope) return null;
  const startWidth = highReg.intercept - lowReg.intercept;
  const endWidth = (highReg.slope * (lookback - 1) + highReg.intercept) - (lowReg.slope * (lookback - 1) + lowReg.intercept);
  if (startWidth <= 0 || endWidth <= 0) return null;
  const convergence = 1 - endWidth / startWidth;
  if (convergence < 0.25) return null;
  const r2Score = (highReg.r2 + lowReg.r2) / 2;
  const confidence = Math.round(Math.min(convergence * 40 + r2Score * 30 + 20, 95));
  if (confidence < 45) return null;
  return { name: "Rising Wedge", icon: "⚠️", confidence, description: `Bearish · Convergence: ${(convergence * 100).toFixed(0)}% · Fit: ${(r2Score * 100).toFixed(0)}%`, color: "amber" };
}

function detectAscendingTriangle(bars) {
  if (bars.length < 20) return null;
  const lookback = Math.min(35, bars.length - 2);
  const slice = bars.slice(-lookback);
  const sHighs = swingHighs(slice.map(b => b.high), 2);
  const sLows = swingLows(slice.map(b => b.low), 2);
  if (sHighs.length < 2 || sLows.length < 2) return null;
  const highVals = sHighs.map(s => s.val);
  const maxH = Math.max(...highVals);
  const minH = Math.min(...highVals);
  const resistanceFlat = (maxH - minH) / maxH * 100;
  if (resistanceFlat > 3.5) return null;
  const lowReg = linReg(sLows.map(s => s.val));
  if (lowReg.slope <= 0) return null;
  const lastClose = slice[slice.length - 1].close;
  const nearResistance = (lastClose / maxH) * 100;
  const confidence = Math.min(
    Math.round(Math.max(0, (3.5 - resistanceFlat) / 3.5 * 40)) +
    Math.round(Math.min(lowReg.slope / slice[0].low * 5000, 30)) +
    (nearResistance > 96 ? 25 : nearResistance > 92 ? 15 : 5) + 5, 95);
  if (confidence < 45) return null;
  return { name: "Ascending Triangle", icon: "🔺", confidence, description: `Resistance: ₹${minH.toFixed(0)}–₹${maxH.toFixed(0)} · Rising lows · At ${nearResistance.toFixed(1)}% of resistance`, color: "sky" };
}

function detectDoubleBottom(bars) {
  if (bars.length < 30) return null;
  const lookback = Math.min(60, bars.length - 2);
  const slice = bars.slice(-lookback);
  const lows = slice.map(b => b.low);
  const closes = slice.map(b => b.close);
  const sLows = swingLows(lows, 3);
  if (sLows.length < 2) return null;
  const sorted = [...sLows].sort((a, b) => a.val - b.val).slice(0, 4);
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const [first, second] = sorted[i].idx < sorted[j].idx ? [sorted[i], sorted[j]] : [sorted[j], sorted[i]];
      const diff = Math.abs(first.val - second.val) / first.val * 100;
      if (diff > 4 || second.idx - first.idx < 5) continue;
      const peakBetween = Math.max(...slice.slice(first.idx, second.idx).map(b => b.high));
      const peakLift = (peakBetween - first.val) / first.val * 100;
      if (peakLift < 5) continue;
      const recovery = (closes[closes.length - 1] - second.val) / (peakBetween - second.val) * 100;
      const confidence = Math.min(Math.round(Math.max(0, (4 - diff) / 4 * 30)) + Math.round(Math.min(peakLift * 2, 30)) + Math.round(Math.min(recovery * 0.35, 35)), 95);
      if (confidence < 45) continue;
      return { name: "Double Bottom", icon: "🔁", confidence, description: `Two lows: ~₹${first.val.toFixed(0)} · Neckline lift: +${peakLift.toFixed(1)}% · Recovery: ${Math.min(recovery, 100).toFixed(0)}%`, color: "cyan" };
    }
  }
  return null;
}

function detectCupHandle(bars) {
  if (bars.length < 45) return null;
  const lookback = Math.min(80, bars.length - 2);
  const slice = bars.slice(-lookback);
  const closes = slice.map(b => b.close);
  const cupLen = Math.floor(lookback * 0.7);
  const cupSlice = closes.slice(0, cupLen);
  const handleSlice = closes.slice(cupLen);
  const cupLeft = cupSlice[0];
  const cupRight = cupSlice[cupSlice.length - 1];
  const cupBot = Math.min(...cupSlice);
  const leftDepth = (cupLeft - cupBot) / cupLeft * 100;
  const rightDepth = (cupRight - cupBot) / cupRight * 100;
  if (leftDepth < 8 || rightDepth < 8) return null;
  const symmetry = 100 - Math.abs(leftDepth - rightDepth) * 5;
  if (symmetry < 50) return null;
  const handleHigh = Math.max(...handleSlice);
  const handleLow = Math.min(...handleSlice);
  const handleRange = (handleHigh - handleLow) / handleHigh * 100;
  if (handleRange > 10) return null;
  const handlePullback = (cupRight - handleLow) / cupRight * 100;
  if (handlePullback > 10) return null;
  const confidence = Math.min(Math.round(Math.min(leftDepth * 1.5, 30)) + Math.round((symmetry - 50) / 50 * 30) + Math.round(Math.max(0, (10 - handleRange) * 3)) + 5, 95);
  if (confidence < 45) return null;
  return { name: "Cup & Handle", icon: "☕", confidence, description: `Cup depth: ${leftDepth.toFixed(1)}% · Symmetry: ${symmetry.toFixed(0)}% · Handle range: ${handleRange.toFixed(1)}%`, color: "orange" };
}

// ── Yahoo Finance Fetchers ─────────────────────────────────────────────────────
async function fetchChart(symbol) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${symbol}?interval=1d&range=6mo&includePrePost=false`;
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
    })).filter(b => b.close > 0);
  } catch { return []; }
}

async function batchQuote(symbols) {
  const url = `${YAHOO_BASE}/v8/finance/spark?symbols=${symbols.join(",")}&range=1d&interval=5m`;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return new Map();
    const json = await resp.json();
    const map = new Map();
    for (const d of Object.values(json)) {
      if (d && d.close?.length > 0) {
        const price = d.close[d.close.length - 1] ?? d.previousClose;
        map.set(d.symbol, { price, changePct: d.previousClose > 0 ? ((price - d.previousClose) / d.previousClose) * 100 : 0 });
      }
    }
    return map;
  } catch { return new Map(); }
}

async function batchQuoteAll(symbols) {
  const all = new Map();
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  for (let i = 0; i < chunks.length; i += 8) {
    const wave = chunks.slice(i, i + 8);
    const maps = await Promise.all(wave.map(c => batchQuote(c)));
    for (const m of maps) for (const [k, v] of m) all.set(k, v);
    if (i + 8 < chunks.length) await new Promise(r => setTimeout(r, 150));
  }
  return all;
}

function getUniverse(universe, customSymbols) {
  if (universe === "nifty50") return NIFTY50_SYMBOLS;
  if (universe === "nifty100") return NIFTY100_SYMBOLS;
  if (universe === "nifty500") return [...new Set(NIFTY500_SYMBOLS)];
  if (universe === "custom") return customSymbols.length > 0 ? customSymbols : NIFTY50_SYMBOLS;
  return NIFTY50_SYMBOLS;
}

// ── Handler ────────────────────────────────────────────────────────────────────
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
    minConfidence = 60,
    maxSymbols = 60,
  } = req.body ?? {};

  try {
    const allSymbols = getUniverse(universe, customSymbols);
    const quoteMap = await batchQuoteAll(allSymbols);

    const ranked = [...quoteMap.entries()]
      .sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct))
      .slice(0, Math.min(maxSymbols, allSymbols.length))
      .map(([sym]) => sym);

    const matches = [];
    const CONCURRENCY = 8;

    for (let i = 0; i < ranked.length; i += CONCURRENCY) {
      const batch = ranked.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(batch.map(async symbol => {
        const bars = await fetchChart(symbol);
        if (bars.length < 25) return null;

        const closes = bars.map(b => b.close);
        const volumes = bars.map(b => b.volume);
        const rsi = (() => {
          if (closes.length < 15) return 50;
          const changes = closes.slice(1).map((p, i) => p - closes[i]);
          const recent = changes.slice(-14);
          const avgGain = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
          const avgLoss = Math.abs(recent.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
          return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        })();

        const last20Vol = volumes.slice(-21, -1);
        const avgVol20 = last20Vol.reduce((a, b) => a + b, 0) / 20;
        const volumeRatio = avgVol20 > 0 ? volumes[volumes.length - 1] / avgVol20 : 1;

        const detectors = {
          bullFlag: detectBullFlag,
          fallingWedge: detectFallingWedge,
          ascendingTriangle: detectAscendingTriangle,
          doubleBottom: detectDoubleBottom,
          cupHandle: detectCupHandle,
          risingWedge: detectRisingWedge,
        };

        const foundPatterns = [];
        for (const key of selectedPatterns) {
          if (detectors[key]) {
            const result = detectors[key](bars);
            if (result && result.confidence >= minConfidence) foundPatterns.push(result);
          }
        }

        if (foundPatterns.length === 0) return null;

        const q = quoteMap.get(symbol) ?? { price: closes[closes.length - 1], changePct: 0 };

        return {
          symbol,
          name: getName(symbol),
          price: +q.price.toFixed(2),
          changePct: +q.changePct.toFixed(2),
          rsi: +rsi.toFixed(1),
          volumeRatio: +volumeRatio.toFixed(2),
          volume: Math.round(volumes[volumes.length - 1]),
          avgVolume20: Math.round(avgVol20),
          patterns: foundPatterns.sort((a, b) => b.confidence - a.confidence),
          topPattern: foundPatterns[0].name,
          topConfidence: foundPatterns[0].confidence,
        };
      }));

      for (const r of settled) {
        if (r.status === "fulfilled" && r.value) matches.push(r.value);
      }
    }

    matches.sort((a, b) => b.topConfidence - a.topConfidence || b.patterns.length - a.patterns.length);

    return res.status(200).json({
      matches,
      scannedAt: new Date().toISOString(),
      totalScanned: ranked.length,
      totalMatched: matches.length,
      universe,
    });
  } catch (err) {
    console.error("India pattern scan error:", err);
    return res.status(500).json({ error: err.message ?? "Pattern scan failed" });
  }
}
