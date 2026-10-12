const { ethers } = require("ethers");
const Pool = require("../models/Pool.model");
const Swap = require("../models/Swap.model");
const Token = require("../models/Token.model");

const NUMN_ADDRESS = "0x0000000000000000000000000000000000000802";
let cachedNumenUsd = { value: null, expiresAt: 0 };

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRaw(raw, decimals) {
  try {
    return Number(ethers.formatUnits(raw || "0", Number(decimals ?? 18)));
  } catch {
    return 0;
  }
}

async function getNumenUsdPrice() {
  const now = Date.now();
  if (cachedNumenUsd.expiresAt > now) return cachedNumenUsd.value;

  const id = String(process.env.NUMN_COINGECKO_ID || "numen").trim();
  const cacheMs = Math.max(15_000, Number(process.env.MARKET_PRICE_CACHE_MS || 60_000));

  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", id);
    url.searchParams.set("vs_currencies", "usd");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "NumenDEX/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Price provider returned ${response.status}`);
    const body = await response.json();
    const price = safeNumber(body?.[id]?.usd);
    cachedNumenUsd = { value: price && price > 0 ? price : null, expiresAt: now + cacheMs };
  } catch {
    cachedNumenUsd = { value: null, expiresAt: now + Math.min(cacheMs, 30_000) };
  }

  return cachedNumenUsd.value;
}

function buildNumenPriceMap(pools) {
  const graph = new Map();

  function edge(from, to, rate) {
    if (!rate || !Number.isFinite(rate) || rate <= 0) return;
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push({ to, rate });
  }

  for (const pool of pools) {
    const a = String(pool.token0 || "").toLowerCase();
    const b = String(pool.token1 || "").toLowerCase();
    const r0 = formatRaw(pool.reserve0, pool.token0Decimals);
    const r1 = formatRaw(pool.reserve1, pool.token1Decimals);
    if (!a || !b || r0 <= 0 || r1 <= 0) continue;
    edge(a, b, r1 / r0);
    edge(b, a, r0 / r1);
  }

  const result = new Map([[NUMN_ADDRESS, 1]]);
  const queue = [NUMN_ADDRESS];

  while (queue.length) {
    const current = queue.shift();
    const currentInNumen = result.get(current);
    for (const item of graph.get(current) || []) {
      if (result.has(item.to)) continue;
      result.set(item.to, currentInNumen / item.rate);
      queue.push(item.to);
    }
  }

  return result;
}

function getTokenSide(pool, tokenAddress) {
  if (tokenAddress === String(pool.token0).toLowerCase()) return 0;
  if (tokenAddress === String(pool.token1).toLowerCase()) return 1;
  return null;
}

async function aggregatePairVolumes(windows) {
  const swapVolume = (side) => ({
    $max: [{ $toDecimal: `$amount${side}In` }, { $toDecimal: `$amount${side}Out` }],
  });
  const sumSince = (cutoff, side) => ({
    $sum: { $cond: [{ $gte: ["$blockTimestamp", new Date(cutoff)] }, swapVolume(side), 0] },
  });

  const group = { _id: "$pairAddress", all0: { $sum: swapVolume(0) }, all1: { $sum: swapVolume(1) } };
  for (const [key, cutoff] of Object.entries(windows)) {
    group[`${key}0`] = sumSince(cutoff, 0);
    group[`${key}1`] = sumSince(cutoff, 1);
  }

  const rows = await Swap.aggregate([{ $group: group }]);
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, k === "_id" ? v : v.toString()]))
  );
}

async function getMarketSnapshot() {
  const [pools, tokens, numenUsd] = await Promise.all([
    Pool.find({ isActive: true }).lean(),
    Token.find({}).lean(),
    getNumenUsdPrice(),
  ]);

  const priceNumen = buildNumenPriceMap(pools);
  const priceUsd = new Map();
  if (numenUsd) {
    for (const [address, value] of priceNumen.entries()) {
      priceUsd.set(address, value * numenUsd);
    }
  }

  return { pools, tokens, numenUsd, priceNumen, priceUsd };
}

async function getTokenMarketData() {
  const snapshot = await getMarketSnapshot();
  const now = Date.now();
  const windows = {
    volume1hUsd: now - 60 * 60 * 1000,
    volume1dUsd: now - 24 * 60 * 60 * 1000,
    volume1wUsd: now - 7 * 24 * 60 * 60 * 1000,
    volume1mUsd: now - 30 * 24 * 60 * 60 * 1000,
    volume1yUsd: now - 365 * 24 * 60 * 60 * 1000,
  };

  const volumeByPair = await aggregatePairVolumes(windows);
  const poolByAddress = new Map(snapshot.pools.map((p) => [String(p.pairAddress).toLowerCase(), p]));

  return snapshot.tokens.map((token) => {
    const address = String(token.address).toLowerCase();
    const pNumen = snapshot.priceNumen.get(address) ?? null;
    const pUsd = snapshot.priceUsd.get(address) ?? null;
    const supply = formatRaw(token.totalSupply, token.decimals);
    const volumes = Object.fromEntries(Object.keys(windows).map((key) => [key, 0]));
    let allTimeCurrentUsd = 0;

    for (const pairVolume of volumeByPair) {
      if (pUsd === null) break;
      const pool = poolByAddress.get(pairVolume._id);
      if (!pool) continue;
      const side = getTokenSide(pool, address);
      if (side === null) continue;
      const decimals = side === 0 ? pool.token0Decimals : pool.token1Decimals;
      const usdOf = (raw) => formatRaw(raw, decimals) * pUsd;
      for (const key of Object.keys(windows)) volumes[key] += usdOf(pairVolume[`${key}${side}`]);
      allTimeCurrentUsd += usdOf(pairVolume[`all${side}`]);
    }

    return {
      ...token,
      priceNumen: pNumen,
      priceUsd: pUsd,
      fdvUsd: pUsd === null ? null : supply * pUsd,
      ...Object.fromEntries(Object.entries(volumes).map(([k, v]) => [k, pUsd === null ? null : v])),
      volumeAllUsd: pUsd === null ? null : allTimeCurrentUsd,
      pricingSource: pUsd === null ? (pNumen === null ? null : "onchain-numen") : "onchain-numen+coingecko-numen-usd",
    };
  });
}

async function enrichPoolStatsWithUsd(stats) {
  const snapshot = await getMarketSnapshot();
  const p0 = snapshot.priceUsd.get(String(stats.token0.address).toLowerCase()) ?? null;
  const p1 = snapshot.priceUsd.get(String(stats.token1.address).toLowerCase()) ?? null;
  if (p0 === null || p1 === null) return stats;

  const reserve0 = Number(stats.token0.reserveFormatted || 0);
  const reserve1 = Number(stats.token1.reserveFormatted || 0);
  const tvlUsd = reserve0 * p0 + reserve1 * p1;
  const volume1dUsd = Math.max(Number(stats.volume1d.token0 || 0) * p0, Number(stats.volume1d.token1 || 0) * p1);
  const volume30dUsd = Math.max(Number(stats.volume30d.token0 || 0) * p0, Number(stats.volume30d.token1 || 0) * p1);
  const apr = tvlUsd > 0 ? (volume1dUsd * 0.003 * 365 / tvlUsd) * 100 : null;

  return {
    ...stats,
    tvlUsd,
    volume1dUsd,
    volume30dUsd,
    volumeTvlRatio: tvlUsd > 0 ? volume1dUsd / tvlUsd : null,
    apr,
  };
}

async function getTokenPriceHistory(tokenAddress, period = "1d") {
  const address = String(tokenAddress || "").toLowerCase();
  if (!ethers.isAddress(address)) throw new Error("Invalid token address.");

  const durations = {
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "1m": 30 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
  };
  const snapshot = await getMarketSnapshot();
  const related = snapshot.pools.filter((pool) =>
    address === String(pool.token0).toLowerCase() ||
    address === String(pool.token1).toLowerCase()
  );
  if (!related.length) return [];

  const query = { pairAddress: { $in: related.map((p) => p.pairAddress) } };
  if (durations[period]) query.blockTimestamp = { $gte: new Date(Date.now() - durations[period]) };

  const swaps = await Swap.find(query).sort({ blockTimestamp: 1 }).limit(2000).lean();
  const poolMap = new Map(related.map((p) => [String(p.pairAddress).toLowerCase(), p]));
  const points = [];

  for (const swap of swaps) {
    const pool = poolMap.get(String(swap.pairAddress).toLowerCase());
    if (!pool) continue;
    const tokenIs0 = address === String(pool.token0).toLowerCase();
    const tokenAmount = tokenIs0
      ? Math.max(formatRaw(swap.amount0In, pool.token0Decimals), formatRaw(swap.amount0Out, pool.token0Decimals))
      : Math.max(formatRaw(swap.amount1In, pool.token1Decimals), formatRaw(swap.amount1Out, pool.token1Decimals));
    const otherAmount = tokenIs0
      ? Math.max(formatRaw(swap.amount1In, pool.token1Decimals), formatRaw(swap.amount1Out, pool.token1Decimals))
      : Math.max(formatRaw(swap.amount0In, pool.token0Decimals), formatRaw(swap.amount0Out, pool.token0Decimals));
    if (tokenAmount <= 0 || otherAmount <= 0) continue;

    const otherAddress = String(tokenIs0 ? pool.token1 : pool.token0).toLowerCase();
    const otherNumen = snapshot.priceNumen.get(otherAddress);
    if (!Number.isFinite(otherNumen)) continue;
    const priceNumen = (otherAmount * otherNumen) / tokenAmount;
    points.push({
      timestamp: swap.blockTimestamp,
      priceNumen,
      priceUsd: snapshot.numenUsd ? priceNumen * snapshot.numenUsd : null,
      txHash: swap.transactionHash,
    });
  }

  return points;
}

module.exports = {
  NUMN_ADDRESS,
  getNumenUsdPrice,
  getMarketSnapshot,
  getTokenMarketData,
  enrichPoolStatsWithUsd,
  getTokenPriceHistory,
};
