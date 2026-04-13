import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import * as XLSX from "xlsx";

const API_BASE = "/api/india";

const PATTERN_OPTIONS = [
  { key: "bullFlag",          label: "Bull Flag",           icon: "🏳️", desc: "Strong pole + tight consolidation" },
  { key: "fallingWedge",      label: "Falling Wedge",       icon: "📐", desc: "Converging descending trendlines" },
  { key: "ascendingTriangle", label: "Ascending Triangle",  icon: "🔺", desc: "Flat resistance + rising lows" },
  { key: "doubleBottom",      label: "Double Bottom",       icon: "🔁", desc: "W-shape reversal pattern" },
  { key: "cupHandle",         label: "Cup & Handle",        icon: "☕", desc: "U-base with handle breakout" },
  { key: "risingWedge",       label: "Rising Wedge",        icon: "⚠️", desc: "Bearish — converging up trendlines" },
];

type Universe = "nifty50" | "nifty100" | "nifty500" | "custom";

interface PatternResult {
  name: string;
  icon: string;
  confidence: number;
  description: string;
  color: string;
}

interface PatternMatch {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  rsi: number;
  volumeRatio: number;
  volume: number;
  avgVolume20: number;
  patterns: PatternResult[];
  topPattern: string;
  topConfidence: number;
}

interface ScanResult {
  matches: PatternMatch[];
  scannedAt: string;
  totalScanned: number;
  totalMatched: number;
  universe: string;
}

const UNIVERSE_LABELS: Record<Universe, string> = {
  nifty50: "NIFTY 50",
  nifty100: "NIFTY 100",
  nifty500: "NIFTY 500",
  custom: "Custom",
};

const COLOR_CLASSES: Record<string, { badge: string; bar: string }> = {
  emerald: { badge: "bg-emerald-950 border-emerald-700 text-emerald-300", bar: "#10b981" },
  violet:  { badge: "bg-violet-950 border-violet-700 text-violet-300",   bar: "#8b5cf6" },
  amber:   { badge: "bg-amber-950 border-amber-700 text-amber-300",      bar: "#f59e0b" },
  sky:     { badge: "bg-sky-950 border-sky-700 text-sky-300",            bar: "#0ea5e9" },
  cyan:    { badge: "bg-cyan-950 border-cyan-700 text-cyan-300",         bar: "#06b6d4" },
  orange:  { badge: "bg-orange-950 border-orange-700 text-orange-300",   bar: "#f97316" },
};

function formatVolume(v: number): string {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `${(v / 100_000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
}

function ConfidenceBar({ score, color }: { score: number; color: string }) {
  const barColor = COLOR_CLASSES[color]?.bar ?? "#f97316";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div style={{ width: `${score}%`, backgroundColor: barColor }} className="h-full rounded-full transition-all" />
      </div>
      <span style={{ color: barColor }} className="text-xs font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}

function PatternBadge({ p }: { p: PatternResult }) {
  const cls = COLOR_CLASSES[p.color] ?? COLOR_CLASSES.orange;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls.badge}`}>
      <span>{p.icon}</span>
      {p.name}
      <span className="opacity-70">· {p.confidence}</span>
    </span>
  );
}

function MatchRow({ m, rank }: { m: PatternMatch; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isGreen = m.changePct >= 0;
  const ticker = m.symbol.replace(".NS", "");
  const tvLink = `https://www.tradingview.com/chart/?symbol=NSE:${ticker}`;

  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-3 text-gray-500 text-xs tabular-nums w-8">{rank}</td>
        <td className="px-3 py-3">
          <div className="font-bold text-white text-sm">{ticker}</div>
          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{m.name}</div>
          <a
            href={tvLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            📊 TradingView
          </a>
        </td>
        <td className="px-3 py-3 tabular-nums text-right">
          <div className="text-white text-sm font-medium">₹{m.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          <div className={`text-xs font-medium ${isGreen ? "text-green-400" : "text-red-400"}`}>
            {isGreen ? "+" : ""}{m.changePct.toFixed(2)}%
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {m.patterns.slice(0, 2).map((p, i) => (
              <PatternBadge key={i} p={p} />
            ))}
            {m.patterns.length > 2 && (
              <span className="text-xs text-gray-500 self-center">+{m.patterns.length - 2} more</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 tabular-nums text-right">
          <div className={`text-sm font-medium ${m.rsi < 35 ? "text-green-400" : m.rsi > 70 ? "text-red-400" : "text-gray-300"}`}>
            {m.rsi.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{m.rsi < 35 ? "OS" : m.rsi > 70 ? "OB" : "RSI"}</div>
        </td>
        <td className="px-3 py-3 tabular-nums text-right">
          <div className={`text-sm font-medium ${m.volumeRatio >= 1.5 ? "text-yellow-400" : "text-gray-300"}`}>
            {m.volumeRatio.toFixed(1)}x
          </div>
          <div className="text-xs text-gray-500">{formatVolume(m.volume)}</div>
        </td>
        <td className="px-3 py-3 text-right w-8">
          <div className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-800 bg-gray-900/60">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-3">
              {m.patterns.map((p, i) => {
                const cls = COLOR_CLASSES[p.color] ?? COLOR_CLASSES.orange;
                return (
                  <div key={i} className={`rounded-lg border p-3 ${cls.badge}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{p.icon}</span>
                      <span className="font-bold text-sm">{p.name}</span>
                      <div className="flex-1 ml-2">
                        <ConfidenceBar score={p.confidence} color={p.color} />
                      </div>
                    </div>
                    <p className="text-xs opacity-80">{p.description}</p>
                  </div>
                );
              })}
              <div className="grid grid-cols-3 gap-4 text-xs text-gray-400 pt-1">
                <div><span className="text-gray-600">Avg Vol (20D)</span><br /><span className="text-gray-200">{formatVolume(m.avgVolume20)}</span></div>
                <div><span className="text-gray-600">RSI</span><br /><span className="text-gray-200">{m.rsi.toFixed(1)}</span></div>
                <div><span className="text-gray-600">Vol Ratio</span><br /><span className="text-gray-200">{m.volumeRatio.toFixed(2)}x</span></div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function IndiaPatternScanner() {
  const [location] = useLocation();
  const [universe, setUniverse] = useState<Universe>("nifty50");
  const [customSymbols, setCustomSymbols] = useState("");
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(
    ["bullFlag", "fallingWedge", "ascendingTriangle", "doubleBottom", "cupHandle"]
  );
  const [minConfidence, setMinConfidence] = useState(60);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  function togglePattern(key: string) {
    setSelectedPatterns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const handleScan = useCallback(async () => {
    if (selectedPatterns.length === 0) return;
    setLoading(true);
    setError(null);
    const t0 = Date.now();

    try {
      const symbols = universe === "custom"
        ? customSymbols.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean).map(s => s.endsWith(".NS") ? s : `${s}.NS`)
        : [];

      const resp = await fetch(`${API_BASE}/pattern-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universe, symbols, patterns: selectedPatterns, minConfidence, maxSymbols: 60 }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error((err as { error?: string }).error || "Scan failed");
      }

      const data = await resp.json() as ScanResult;
      setResult(data);
      setElapsed(Date.now() - t0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [universe, customSymbols, selectedPatterns, minConfidence]);

  function exportToExcel() {
    if (!result) return;
    const rows = result.matches.map((m, i) => ({
      Rank: i + 1,
      Symbol: m.symbol.replace(".NS", ""),
      "NSE Symbol": m.symbol,
      Name: m.name,
      "Price (INR)": m.price,
      "Change %": m.changePct,
      RSI: m.rsi,
      "Vol Ratio": m.volumeRatio,
      "Top Pattern": m.topPattern,
      "Top Confidence": m.topConfidence,
      "All Patterns": m.patterns.map(p => `${p.name} (${p.confidence})`).join(" | "),
      Volume: m.volume,
      "Avg Vol (20D)": m.avgVolume20,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 10 },
      { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "India Pattern Scan");
    const dateStr = new Date(result.scannedAt).toISOString().slice(0, 10);
    XLSX.writeFile(wb, `India_Pattern_Scan_${dateStr}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* NSE Header */}
      <div className="border-b border-gray-800 bg-gray-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xl">🇮🇳</span>
            <h1 className="text-base font-bold text-white tracking-tight">India Pre-Market Scanner</h1>
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">NSE</span>
          </div>
          <div className="ml-auto text-xs text-gray-500">
            Chart pattern detection · NIFTY universe
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 pb-0 flex gap-0">
          <Link
            href="/"
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              location === "/"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            📡 Breakout Scanner
          </Link>
          <Link
            href="/patterns"
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              location === "/patterns"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            📐 Pattern Scanner
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-600/40 flex items-center justify-center text-orange-400 text-lg">
            🔍
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Chart Pattern Scanner</h2>
            <p className="text-xs text-gray-500">Detects bullish &amp; reversal patterns from 6-month NSE OHLC data</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          {/* Pattern Selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Patterns to Detect</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PATTERN_OPTIONS.map(opt => {
                const active = selectedPatterns.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => togglePattern(opt.key)}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                      active
                        ? "bg-orange-950 border-orange-600 text-orange-200"
                        : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-base leading-none mt-0.5">{opt.icon}</span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[10px] opacity-60 leading-tight mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Universe */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Universe</label>
              <div className="flex gap-1 flex-wrap">
                {(["nifty50", "nifty100", "nifty500", "custom"] as Universe[]).map(u => (
                  <button
                    key={u}
                    onClick={() => setUniverse(u)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      universe === u
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {UNIVERSE_LABELS[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Confidence */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Min Confidence</label>
              <div className="flex gap-1">
                {[50, 60, 70, 80].map(n => (
                  <button
                    key={n}
                    onClick={() => setMinConfidence(n)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      minConfidence === n
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Scan Button */}
            <div className="flex items-end">
              <button
                onClick={handleScan}
                disabled={loading || selectedPatterns.length === 0}
                className={`w-full px-4 py-2 rounded text-sm font-bold border transition-all ${
                  loading || selectedPatterns.length === 0
                    ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-500 border-orange-500 text-white cursor-pointer"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Scanning...
                  </span>
                ) : "🔍 Scan Patterns"}
              </button>
            </div>
          </div>

          {universe === "custom" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Custom Symbols (e.g. RELIANCE, TCS, INFY)</label>
              <textarea
                value={customSymbols}
                onChange={e => setCustomSymbols(e.target.value)}
                placeholder="RELIANCE, TCS, INFY, HDFCBANK..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-600 resize-none"
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="animate-spin w-14 h-14 text-orange-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl">🔍</span>
              </div>
              <p className="text-gray-400 text-sm">Fetching NSE OHLC data · Running pattern algorithms...</p>
              <p className="text-gray-600 text-xs">May take 45–90 seconds for larger universes</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-400">
              <span>
                <span className="text-white font-medium">{result.totalMatched}</span> pattern matches
              </span>
              <span>·</span>
              <span>{result.totalScanned} scanned</span>
              <span>·</span>
              <span>{UNIVERSE_LABELS[result.universe as Universe] || result.universe}</span>
              {elapsed && (
                <>
                  <span>·</span>
                  <span>{(elapsed / 1000).toFixed(1)}s</span>
                </>
              )}
              <span>·</span>
              <span className="text-gray-600">
                {new Date(result.scannedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
              </span>
              {result.matches.length > 0 && (
                <button
                  onClick={exportToExcel}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border bg-green-950 border-green-800 text-green-300 hover:bg-green-900 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Excel
                </button>
              )}
            </div>

            {result.matches.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-400 text-sm">No pattern matches found with current settings.</p>
                <p className="text-gray-600 text-xs mt-1">Try lowering Min Confidence or selecting more patterns.</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500 text-xs">
                        <th className="px-3 py-2 text-left w-8">#</th>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-left">Detected Patterns</th>
                        <th className="px-3 py-2 text-right">RSI</th>
                        <th className="px-3 py-2 text-right">Vol Ratio</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.map((m, i) => (
                        <MatchRow key={m.symbol} m={m} rank={i + 1} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!result && !loading && !error && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-5xl mb-3">📐</div>
            <p className="text-gray-400 text-sm font-medium mb-1">NSE Chart Pattern Scanner</p>
            <p className="text-gray-600 text-xs mb-6">Select patterns and click Scan to find NSE stocks forming bullish setups</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              {PATTERN_OPTIONS.map(opt => (
                <div key={opt.key} className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <div className="text-xs font-semibold text-gray-200">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
