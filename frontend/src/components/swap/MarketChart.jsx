import { useEffect, useMemo, useState } from "react";
import NumenLogo from "../common/NumenLogo";
import { TOKEN_ADDRESSES } from "../../config/network";
import { getToken, getTokenPriceHistory } from "../../services/api";
import "./MarketChart.css";
const PERIODS = ["1H", "1D", "1W", "1M", "1Y"];
const usd = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 6 }).format(Number(value));
};
export default function MarketChart({ onClose }) {
  const [period, setPeriod] = useState("1D");
  const [points, setPoints] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setPoints([]);
    Promise.all([getTokenPriceHistory(TOKEN_ADDRESSES.NUMN, period.toLowerCase(), controller.signal), getToken(TOKEN_ADDRESSES.NUMN)])
      .then(([history, token]) => {
        if (controller.signal.aborted) return;
        setCurrent(token?.priceUsd ?? null);
        setPoints(history.filter(p => p && Number.isFinite(Number(p.priceUsd)) && Number(p.priceUsd) > 0 && Number.isFinite(new Date(p.timestamp).getTime())));
      })
      .catch(e => { if (!controller.signal.aborted) setError(e.message || "Market data unavailable"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period]);
  const plot = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map(p => Number(p.priceUsd));
    const min = Math.min(...values), max = Math.max(...values), spread = max - min || Math.max(max * 0.01, 1e-12);
    const times = points.map(p => new Date(p.timestamp).getTime());
    const t0 = Math.min(...times), dt = Math.max(...times) - t0 || 1;
    return points.map((p, i) => `${i ? "L" : "M"}${(times[i] - t0) / dt * 600},${145 - (values[i] - min) / spread * 125}`).join(" ");
  }, [points]);
  return <section className="market-card" aria-label="NUMN market chart">
    <div className="market-top"><div className="market-token"><NumenLogo size={32}/><div><strong>NUMN</strong><span>Numen Network</span></div></div><button type="button" className="close-chart-button" onClick={onClose} aria-label="Close chart">×</button></div>
    <div className="market-price"><span className="market-price-label">NUMN market · USD</span><strong>{usd(current)}</strong><span className="market-change">Historical trade prices · not a price oracle</span></div>
    <div className="chart-placeholder" role="img" aria-label={`NUMN historical prices over ${period}`}>
      {loading ? <p>Loading historical prices…</p> : error ? <p role="alert">{error}</p> : !plot ? <p>Not enough indexed USD-priced swaps to draw a chart.</p> : <svg viewBox="0 0 600 160" preserveAspectRatio="none" style={{width:"100%",height:"100%"}}><path d={plot} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>}
    </div>
    <div className="chart-periods">{PERIODS.map(p => <button type="button" key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)} aria-pressed={period === p}>{p}</button>)}</div>
  </section>;
}
