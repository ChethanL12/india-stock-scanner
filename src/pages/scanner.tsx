import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

const API_BASE = "/api/india";

type Universe = "nifty50" | "nifty100" | "nifty500" | "custom";

interface Signals {
  closeAboveEma20: boolean;
  ema20AboveEma50: boolean;
  rsiAbove50: boolean;
  volumeAboveAvg: boolean;
  nearHighestHigh: boolean;
  greenCandle: boolean;
}

interface BreakoutCandidate {
  symbol: string;
  name: string;
  price: number;
  open: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume20: number;
  volumeRatio: number;
  rsi: number;
  ema20: number;
  ema50: number;
  highestHigh20: number;
  nearHighPct: number;
  signals: Signals;
  signalCount: number;
  convictionScore: number;
  signalDetails: string[];
}

interface ScanResult {
  candidates: BreakoutCandidate[];
  scannedAt: string;
  totalScanned: number;
  totalQuoted: number;
  totalPassed: number;
  universe: string;
}

const UNIVERSE_LABELS: Record<Universe, string> = {
  nifty50: "NIFTY 50",
  nifty100: "NIFTY 100",
  nifty500: "NIFTY 500",
  custom: "Custom",
};

const SIGNAL_LABELS: (keyof Signals)[] = [
  "closeAboveEma20",
  "ema20AboveEma50",
  "rsiAbove50",
  "volumeAboveAvg",
  "nearHighestHigh",
  "greenCandle",
];

const SIGNAL_DISPLAY: Record<keyof Signals, string> = {
  closeAboveEma20: "Close > EMA20",
  ema20AboveEma50: "EMA20 > EMA50",
  rsiAbove50: "RSI ≥ 50",
  volumeAboveAvg: "Vol ≥ AvgVol",
  nearHighestHigh: "Near 20D High",
  greenCandle: "Green Candle",
};

function formatVolume(v: number): string {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `${(v / 100_000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
}

function ConvictionBar({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div style={{ width: `${score}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
      </div>
      <span style={{ color }} className="text-xs font-bold tabular-nums w-8 text-right">{score}</span>
    </div>
  );
}

function SignalDots({ signals, signalCount }: { signals: Signals; signalCount: number }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {SIGNAL_LABELS.map(key => (
        <span
          key={key}
          title={SIGNAL_DISPLAY[key]}
          className={`w-2.5 h-2.5 rounded-full inline-block ${signals[key] ? "bg-green-500" : "bg-gray-700"}`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{signalCount}/6</span>
    </div>
  );
}

function CandidateRow({ c, rank }: { c: BreakoutCandidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isGreen = c.changePct >= 0;

  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-3 text-gray-500 text-xs tabular-nums w-8">{rank}</td>
        <td className="px-3 py-3">
          <div className="font-bold text-white text-sm">{c.symbol.replace(".NS", "")}</div>
          <div className="text-xs text-gray-400 truncate max-w-[140px]">{c.name}</div>
        </td>
        <td className="px-3 py-3 tabular-nums text-right">
          <div className="text-white text-sm font-medium">₹{c.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
          <div className={`text-xs font-medium ${isGreen ? "text-green-400" : "text-red-400"}`}>
            {isGreen ? "+" : ""}{c.changePct.toFixed(2)}%
          </div>
        </td>
        <td className="px-3 py-3 tabular-nums text-right text-sm">
          <div className="text-gray-300">{c.rsi.toFixed(1)}</div>
          <div className="text-xs text-gray-500">RSI</div>
        </td>
        <td className="px-3 py-3 tabular-nums text-right text-sm">
          <div className={`font-medium ${c.volumeRatio >= 1.5 ? "text-yellow-400" : "text-gray-300"}`}>{c.volumeRatio.toFixed(1)}x</div>
          <div className="text-xs text-gray-500">{formatVolume(c.volume)}</div>
        </td>
        <td className="px-3 py-3 text-right w-8">
          <div className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</div>
        </td>
        <td className="px-3 py-3 min-w-[180px]">
          <ConvictionBar score={c.convictionScore} />
          <div className="mt-1.5">
            <SignalDots signals={c.signals} signalCount={c.signalCount} />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-800 bg-gray-900/60">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-xs mb-3">
              <div>
                <span className="text-gray-500">Open</span>
                <span className="ml-2 text-gray-200">₹{c.open.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-gray-500">EMA20</span>
                <span className="ml-2 text-gray-200">₹{c.ema20.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-gray-500">EMA50</span>
                <span className="ml-2 text-gray-200">₹{c.ema50.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-gray-500">20D High</span>
                <span className="ml-2 text-gray-200">₹{c.highestHigh20.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-gray-500">From High</span>
                <span className={`ml-2 ${c.nearHighPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {c.nearHighPct >= 0 ? "+" : ""}{c.nearHighPct.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Avg Vol (20D)</span>
                <span className="ml-2 text-gray-200">{formatVolume(c.avgVolume20)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.signalDetails.map((d, i) => {
                const isPositive = SIGNAL_LABELS[i] !== undefined && c.signals[SIGNAL_LABELS[i]];
                return (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      isPositive
                        ? "bg-green-950 border-green-800 text-green-300"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {d}
                  </span>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function IndiaScanner() {
  const [universe, setUniverse] = useState<Universe>("nifty50");
  const [customSymbols, setCustomSymbols] = useState("");
  const [minSignals, setMinSignals] = useState(4);
  const [minConviction, setMinConviction] = useState(60);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  function exportToExcel() {
    if (!result) return;
    const rows = result.candidates.map((c, i) => ({
      Rank: i + 1,
      Symbol: c.symbol.replace(".NS", ""),
      "NSE Symbol": c.symbol,
      Name: c.name,
      "Price (INR)": c.price,
      "Change %": c.changePct,
      RSI: c.rsi,
      EMA20: c.ema20,
      EMA50: c.ema50,
      "20D High": c.highestHigh20,
      "From High %": c.nearHighPct,
      Volume: c.volume,
      "Avg Vol (20D)": c.avgVolume20,
      "Vol Ratio": c.volumeRatio,
      "Signal Count": c.signalCount,
      "Conviction Score": c.convictionScore,
      "Close > EMA20": c.signals.closeAboveEma20 ? "Yes" : "No",
      "EMA20 > EMA50": c.signals.ema20AboveEma50 ? "Yes" : "No",
      "RSI ≥ 50": c.signals.rsiAbove50 ? "Yes" : "No",
      "Vol ≥ Avg": c.signals.volumeAboveAvg ? "Yes" : "No",
      "Near 20D High": c.signals.nearHighestHigh ? "Yes" : "No",
      "Green Candle": c.signals.greenCandle ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 10 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 13 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "India Breakout Scan");
    const dateStr = new Date(result.scannedAt).toISOString().slice(0, 10);
    XLSX.writeFile(wb, `India_Breakout_Scan_${dateStr}.xlsx`);
  }

  const runScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    const t0 = Date.now();

    try {
      const symbols = universe === "custom"
        ? customSymbols.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean).map(s => s.endsWith(".NS") ? s : `${s}.NS`)
        : [];

      const resp = await fetch(`${API_BASE}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universe, symbols, minSignals, minConviction }),
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
  }, [universe, customSymbols, minSignals, minConviction]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xl">🇮🇳</span>
            <h1 className="text-base font-bold text-white tracking-tight">India Pre-Market Scanner</h1>
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">NSE</span>
          </div>
          <div className="ml-auto text-xs text-gray-500">
            Breakout detection · NIFTY universe
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Universe */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Universe</label>
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

            {/* Min Signals */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Signals (of 6)</label>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setMinSignals(n)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      minSignals === n
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Min Conviction */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Conviction Score</label>
              <div className="flex gap-1">
                {[50, 60, 70, 80].map(n => (
                  <button
                    key={n}
                    onClick={() => setMinConviction(n)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      minConviction === n
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan button */}
            <div className="flex items-end">
              <button
                onClick={runScan}
                disabled={loading}
                className={`w-full px-4 py-2 rounded text-sm font-bold border transition-all ${
                  loading
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
                ) : (
                  "▶ Run Scan"
                )}
              </button>
            </div>
          </div>

          {/* Custom symbols input */}
          {universe === "custom" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Custom Symbols (comma or space separated, e.g. RELIANCE, TCS)</label>
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

        {/* Signals legend */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-400">Signals:</span>
          {SIGNAL_LABELS.map(key => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {SIGNAL_DISPLAY[key]}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-gray-400 text-sm">Fetching quotes and running breakout analysis...</p>
              <p className="text-gray-600 text-xs">This may take 30–90 seconds for larger universes</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div>
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-400">
              <span>
                <span className="text-white font-medium">{result.totalPassed}</span> breakout candidates
              </span>
              <span>·</span>
              <span>
                <span className="text-gray-200">{result.totalQuoted}</span>/{result.totalScanned} quoted
              </span>
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
              {result.candidates.length > 0 && (
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

            {result.candidates.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-400 text-sm">No breakout candidates found with current filters.</p>
                <p className="text-gray-600 text-xs mt-1">Try lowering Min Signals or Min Conviction Score.</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-right">Price / Change</th>
                      <th className="px-3 py-2 text-right">RSI</th>
                      <th className="px-3 py-2 text-right">Vol Ratio</th>
                      <th className="px-3 py-2 w-8" />
                      <th className="px-3 py-2 text-left min-w-[180px]">Conviction / Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.candidates.map((c, i) => (
                      <CandidateRow key={c.symbol} c={c} rank={i + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Initial state */}
        {!result && !loading && !error && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-400 text-sm font-medium">Ready to scan NSE stocks for breakout patterns</p>
            <p className="text-gray-600 text-xs mt-1 mb-4">Select universe and click Run Scan</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              {[
                { icon: "📈", label: "Close > EMA20", desc: "Price above 20-day EMA" },
                { icon: "⬆️", label: "EMA20 > EMA50", desc: "Uptrend alignment" },
                { icon: "💪", label: "RSI ≥ 50", desc: "Bullish momentum" },
                { icon: "🔊", label: "Volume ≥ Avg", desc: "Above average turnover" },
                { icon: "🎯", label: "Near 20D High", desc: "Within 2% of recent high" },
                { icon: "🟢", label: "Green Candle", desc: "Close > Open today" },
              ].map(item => (
                <div key={item.label} className="bg-gray-800/60 rounded p-2.5">
                  <div className="text-base mb-0.5">{item.icon}</div>
                  <div className="text-xs font-medium text-gray-200">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
