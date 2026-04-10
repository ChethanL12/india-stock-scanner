// Vercel Serverless Function: /api/india/scan

const YAHOO_BASE = "https://query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── India Stock Universes (.NS suffix for Yahoo Finance) ─────────────────────
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
  "POLYCAB.NS","FINCABLES.NS","RVNL.NS","RITES.NS","IRCON.NS","NBCC.NS","NCC.NS",
  "JSWENERGY.NS","WAAREEENER.NS","ADANITRANS.NS","ROUTE.NS","JUSTDIAL.NS",
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

// ── Technical Indicators ─────────────────────────────────────────────────────
function calcEma(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [ema];
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRsi(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const recent = changes.slice(-period);
  const avgGain = recent.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const avgLoss = Math.abs(recent.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ── Yahoo Finance Fetchers ────────────────────────────────────────────────────
async function fetchChart(symbol) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${symbol}?interval=1d&range=6mo&includePrePost=false`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(9000),
    });
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
        const changePct = d.previousClose > 0 ? ((price - d.previousClose) / d.previousClose) * 100 : 0;
        map.set(d.symbol, { price, changePct });
      }
    }
    return map;
  } catch { return new Map(); }
}

async function batchQuoteAll(symbols) {
  const quoteMap = new Map();
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  for (let i = 0; i < chunks.length; i += 8) {
    const wave = chunks.slice(i, i + 8);
    const maps = await Promise.all(wave.map(c => batchQuote(c)));
    for (const m of maps) for (const [k, v] of m) quoteMap.set(k, v);
    if (i + 8 < chunks.length) await new Promise(r => setTimeout(r, 150));
  }
  return quoteMap;
}

// ── Breakout Analysis ─────────────────────────────────────────────────────────
function analyzeBreakout(bars, symbol, name, quickChangePct) {
  if (bars.length < 55) return null;
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const highs = bars.map(b => b.high);
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  const price = lastBar.close;
  const open = lastBar.open;
  const change = price - prevBar.close;
  const changePct = quickChangePct ?? ((change / prevBar.close) * 100);
  const ema20Arr = calcEma(closes, 20);
  const ema50Arr = calcEma(closes, 50);
  const ema20 = ema20Arr[ema20Arr.length - 1] ?? price;
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? price;
  const rsi = calcRsi(closes);
  const highestHigh20 = Math.max(...highs.slice(-20));
  const last20Volumes = volumes.slice(-21, -1);
  const avgVolume20 = last20Volumes.reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = avgVolume20 > 0 ? lastBar.volume / avgVolume20 : 1;
  const nearHighPct = ((price - highestHigh20) / highestHigh20) * 100;
  const closeAboveEma20 = price > ema20;
  const ema20AboveEma50 = ema20 > ema50;
  const rsiAbove50 = rsi >= 50;
  const volumeAboveAvg = lastBar.volume >= avgVolume20;
  const nearHighestHigh = price >= 0.98 * highestHigh20;
  const greenCandle = price > open;
  const signals = { closeAboveEma20, ema20AboveEma50, rsiAbove50, volumeAboveAvg, nearHighestHigh, greenCandle };
  const signalDetails = [
    closeAboveEma20 ? `Above EMA20 (${ema20.toFixed(1)})` : `Below EMA20 (${ema20.toFixed(1)})`,
    ema20AboveEma50 ? "EMA20 > EMA50" : "EMA20 < EMA50",
    rsiAbove50 ? `RSI ${rsi.toFixed(1)} ≥ 50` : `RSI ${rsi.toFixed(1)} < 50`,
    volumeAboveAvg ? `Vol ${volumeRatio.toFixed(1)}x avg` : `Vol ${volumeRatio.toFixed(1)}x avg (low)`,
    nearHighestHigh ? `Within 2% of 20D High (${nearHighPct > 0 ? "+" : ""}${nearHighPct.toFixed(1)}%)` : `${Math.abs(nearHighPct).toFixed(1)}% below 20D High`,
    greenCandle ? "Green Candle" : "Red Candle",
  ];
  const signalCount = [closeAboveEma20, ema20AboveEma50, rsiAbove50, volumeAboveAvg, nearHighestHigh, greenCandle].filter(Boolean).length;
  const convictionScore = Math.round((signalCount / 6) * 100);
  return {
    symbol, name,
    price: +price.toFixed(2), open: +open.toFixed(2),
    change: +change.toFixed(2), changePct: +changePct.toFixed(2),
    volume: Math.round(lastBar.volume), avgVolume20: Math.round(avgVolume20),
    volumeRatio: +volumeRatio.toFixed(2),
    rsi: +rsi.toFixed(2), ema20: +ema20.toFixed(2), ema50: +ema50.toFixed(2),
    highestHigh20: +highestHigh20.toFixed(2), nearHighPct: +nearHighPct.toFixed(2),
    signals, signalCount, convictionScore, signalDetails,
  };
}

function getUniverse(universe, customSymbols) {
  if (universe === "nifty50") return NIFTY50_SYMBOLS;
  if (universe === "nifty100") return NIFTY100_SYMBOLS;
  if (universe === "nifty500") return [...new Set(NIFTY500_SYMBOLS)];
  if (universe === "custom") return customSymbols.length > 0 ? customSymbols : NIFTY50_SYMBOLS;
  return NIFTY50_SYMBOLS;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { universe = "nifty50", symbols: customSymbols = [], minSignals = 4, minConviction = 60 } = req.body ?? {};

  try {
    const allSymbols = getUniverse(universe, customSymbols);

    // Phase 1: Batch Spark quotes for quick change% data
    const quoteMap = await batchQuoteAll(allSymbols);

    // Phase 2: Deep breakout analysis on all symbols
    const candidates = [];
    const CONCURRENCY = 10;
    for (let i = 0; i < allSymbols.length; i += CONCURRENCY) {
      const batch = allSymbols.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(async symbol => {
        const bars = await fetchChart(symbol);
        if (bars.length < 55) return null;
        const q = quoteMap.get(symbol);
        return analyzeBreakout(bars, symbol, getName(symbol), q?.changePct);
      }));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          const c = r.value;
          if (c.signalCount >= minSignals && c.convictionScore >= minConviction) {
            candidates.push(c);
          }
        }
      }
    }

    candidates.sort((a, b) => b.convictionScore - a.convictionScore || b.signalCount - a.signalCount);

    return res.status(200).json({
      candidates,
      scannedAt: new Date().toISOString(),
      totalScanned: allSymbols.length,
      totalQuoted: quoteMap.size,
      totalPassed: candidates.length,
      universe,
    });
  } catch (err) {
    console.error("India scan error:", err);
    return res.status(500).json({ error: err.message ?? "Scan failed" });
  }
}
