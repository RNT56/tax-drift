import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calculator, CheckCircle2, RefreshCw, SearchCheck } from "lucide-react";
import { HistoryLineChart } from "../components/Charts";
import { CustomSelect } from "../components/CustomSelect";
import { MetricTile } from "../components/MetricTile";
import {
  getMarketHistory,
  getMarketQuote,
  searchSymbols,
  type MarketHistory,
  type MarketQuote,
  type SymbolSearchResult
} from "../domain/api";
import { minorToNumber } from "../domain/money";
import type { RouteProps } from "../App";

function numberInput(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : "";
}

function fallbackAsset(position: RouteProps["snapshot"]["positions"][number]): SymbolSearchResult {
  return {
    symbol: position.position.symbol,
    name: position.position.name,
    currency: position.position.price.currency,
    type: position.position.instrumentType,
    provider: position.position.source
  };
}

export default function MarketRoute({ snapshot }: RouteProps) {
  const firstPosition = snapshot.positions[0];
  const [query, setQuery] = useState(firstPosition?.position.symbol || "");
  const [typeFilter, setTypeFilter] = useState("all");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SymbolSearchResult | null>(firstPosition ? fallbackAsset(firstPosition) : null);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [history, setHistory] = useState<MarketHistory | null>(null);
  const [range, setRange] = useState("1Y");
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(!firstPosition);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [error, setError] = useState("");
  const [marketStatus, setMarketStatus] = useState("");
  const searchRequestId = useRef(0);
  const trimmedQuery = query.trim();
  const canSearchAssets = trimmedQuery.length >= 2;
  const [calc, setCalc] = useState(() => {
    const price = firstPosition ? minorToNumber(firstPosition.position.price) : 0;
    const costBasis = firstPosition ? minorToNumber(firstPosition.position.costBasis) : 0;
    return {
      shares: numberInput(firstPosition?.position.quantity || 0),
      costBasis: numberInput(costBasis),
      currentPrice: numberInput(price),
      sellPct: "100",
      transactionCost: "0",
      taxRate: "26.375",
      expectedOldReturn: "5",
      expectedNewReturn: "7"
    };
  });

  const selectedPosition = useMemo(
    () => selectedAsset ? snapshot.positions.find((item) => item.position.symbol === selectedAsset.symbol) : undefined,
    [selectedAsset, snapshot.positions]
  );

  useEffect(() => {
    if (selectedAsset || !firstPosition) return;
    const asset = fallbackAsset(firstPosition);
    setSelectedAsset(asset);
    setQuery(asset.symbol);
    setIsAssetPickerOpen(false);
    setCalc((current) => ({
      ...current,
      shares: numberInput(firstPosition.position.quantity),
      costBasis: numberInput(minorToNumber(firstPosition.position.costBasis)),
      currentPrice: numberInput(minorToNumber(firstPosition.position.price))
    }));
  }, [firstPosition, selectedAsset]);

  const calculation = useMemo(() => {
    const shares = Number(calc.shares);
    const totalCostBasis = Number(calc.costBasis);
    const currentPrice = Number(calc.currentPrice);
    const sellPct = Number(calc.sellPct) / 100;
    const transactionCost = Math.max(0, Number(calc.transactionCost) || 0);
    const taxRate = Math.max(0, Number(calc.taxRate) || 0) / 100;
    const expectedOldReturn = Number(calc.expectedOldReturn) / 100;
    const expectedNewReturn = Number(calc.expectedNewReturn) / 100;
    const sellShares = shares * sellPct;
    const sellValue = sellShares * currentPrice;
    const soldCostBasis = totalCostBasis * sellPct;
    const partialExemption = selectedPosition?.position.instrumentType === "etf" ? 0.7 : 1;
    const taxableGain = Math.max(0, sellValue - soldCostBasis - transactionCost) * partialExemption;
    const taxDue = taxableGain * taxRate;
    const cashAfterTax = sellValue - transactionCost - taxDue;
    const breakEvenRebuy = sellShares > 0 ? cashAfterTax / sellShares : NaN;
    const holdFutureValue = sellValue * (1 + expectedOldReturn);
    const switchFutureValue = cashAfterTax * (1 + expectedNewReturn);
    const requiredNewReturn = cashAfterTax > 0 ? (holdFutureValue / cashAfterTax - 1) * 100 : NaN;
    return {
      sellShares,
      sellValue,
      taxableGain,
      taxDue,
      cashAfterTax,
      breakEvenRebuy,
      holdFutureValue,
      switchFutureValue,
      switchEdge: switchFutureValue - holdFutureValue,
      requiredNewReturn
    };
  }, [calc, selectedPosition]);

  function fillFromPosition(asset: SymbolSearchResult) {
    const position = snapshot.positions.find((item) => item.position.symbol === asset.symbol);
    if (!position) return;
    setCalc((current) => ({
      ...current,
      shares: numberInput(position.position.quantity),
      costBasis: numberInput(minorToNumber(position.position.costBasis)),
      currentPrice: numberInput(minorToNumber(position.position.price))
    }));
  }

  async function loadMarket(asset = selectedAsset, nextRange = range) {
    if (!asset) return;
    setError("");
    setMarketStatus("");
    setIsLoadingMarket(true);
    try {
      const nextQuote = await getMarketQuote(asset, snapshot.baseCurrency);
      setQuote(nextQuote);
      setCalc((current) => ({ ...current, currentPrice: numberInput(nextQuote.price) }));
      setMarketStatus(`Loaded live quote from ${nextQuote.source || "market data"}.`);
      try {
        setHistory(await getMarketHistory(asset, snapshot.baseCurrency, nextRange));
      } catch (caught) {
        setHistory(null);
        setMarketStatus(caught instanceof Error ? `Quote loaded. ${caught.message}` : "Quote loaded. History unavailable.");
      }
    } catch (caught) {
      setQuote(null);
      setHistory(null);
      setError(caught instanceof Error ? caught.message : "Market data request failed.");
    } finally {
      setIsLoadingMarket(false);
    }
  }

  const runAssetSearch = useCallback(async (announce = false) => {
    const searchQuery = query.trim();
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setError("");
    if (announce) setMarketStatus("");
    setIsSearching(true);
    try {
      const response = await searchSymbols(searchQuery, { type: typeFilter, limit: 12 });
      if (requestId !== searchRequestId.current) return;
      setResults(response.results);
      if (announce) {
        setMarketStatus(response.results.length ? `Found ${response.results.length} assets from ${response.source || "search"}.` : "No matching assets found.");
      }
    } catch (caught) {
      if (requestId !== searchRequestId.current) return;
      setError(caught instanceof Error ? caught.message : "Symbol search failed.");
    } finally {
      if (requestId === searchRequestId.current) setIsSearching(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    if (!isAssetPickerOpen) return;
    if (!canSearchAssets) {
      searchRequestId.current += 1;
      setIsSearching(false);
      setResults([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) void runAssetSearch(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [canSearchAssets, isAssetPickerOpen, runAssetSearch, trimmedQuery]);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAssetPickerOpen(true);
    await runAssetSearch(true);
  }

  function selectAsset(asset: SymbolSearchResult) {
    setSelectedAsset(asset);
    setQuery(asset.symbol);
    setIsAssetPickerOpen(false);
    fillFromPosition(asset);
    void loadMarket(asset);
  }

  async function changeRange(nextRange: string) {
    setRange(nextRange);
    if (selectedAsset) await loadMarket(selectedAsset, nextRange);
  }

  const displayedPrice = quote?.price ?? (selectedPosition ? minorToNumber(selectedPosition.position.price) : NaN);
  const displayedCurrency = quote?.currency || selectedPosition?.position.price.currency || snapshot.baseCurrency;
  const selectedMeta = [
    selectedAsset?.type || selectedPosition?.position.instrumentType,
    selectedAsset?.exchange,
    selectedAsset?.currency || selectedPosition?.position.price.currency || snapshot.baseCurrency,
    selectedAsset?.provider || selectedPosition?.position.source
  ].filter(Boolean).join(" | ");

  return (
    <div className="page-grid">
      <section className="hero-band compact">
        <div>
          <p className="eyebrow">Asset selection and market data</p>
          <h2>{selectedAsset ? `${selectedAsset.symbol} ${selectedAsset.name || ""}` : "Search stocks, ETFs, indices, crypto, and FX"}</h2>
          <p>Use live quote/history APIs when configured, or fall back to loaded portfolio prices for tax-aware switch analysis.</p>
        </div>
        <div className="hero-actions">
          <button className="button-link secondary" type="button" onClick={() => setIsAssetPickerOpen((value) => !value)}>
            <SearchCheck size={16} aria-hidden="true" />
            {isAssetPickerOpen ? "Close picker" : "Change asset"}
          </button>
          <button className="button-link" type="button" onClick={() => loadMarket()} disabled={!selectedAsset || isLoadingMarket}>
            <RefreshCw size={16} aria-hidden="true" />
            {isLoadingMarket ? "Loading" : "Refresh market data"}
          </button>
        </div>
      </section>

      {error ? <div className="notice-bar danger-notice">{error}</div> : null}
      {marketStatus ? <div className="notice-bar success-notice">{marketStatus}</div> : null}

      {selectedAsset ? (
        <section className="selected-asset-strip" aria-label="Selected asset">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>{selectedAsset.symbol}</strong>
            <span>{selectedAsset.name || "Selected asset"}</span>
            <small>{selectedMeta || "Loaded from portfolio"}</small>
          </div>
          <button type="button" onClick={() => setIsAssetPickerOpen(true)}>Change</button>
        </section>
      ) : null}

      {isAssetPickerOpen ? <section className="two-column asset-picker">
        <form className="panel research-form" onSubmit={submitSearch}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Find asset</p>
              <h3>Search market data providers</h3>
            </div>
            <SearchCheck size={20} aria-hidden="true" />
          </div>
          <div className="field-grid two">
            <label>
              <span>Symbol or name</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="AAPL, MSCI World, DAX" autoComplete="off" />
            </label>
            <CustomSelect
              label="Asset type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All" },
                { value: "stock", label: "Stocks" },
                { value: "etf", label: "ETFs" },
                { value: "index", label: "Indices" },
                { value: "crypto", label: "Crypto" },
                { value: "fx", label: "FX" }
              ]}
            />
          </div>
          <div className="button-row">
            <button type="submit" disabled={isSearching || !canSearchAssets}>{isSearching ? "Searching" : "Search now"}</button>
          </div>
          <div className="asset-result-list">
            {isSearching ? <p className="empty-copy">Searching assets...</p> : null}
            {!isSearching && canSearchAssets && !results.length ? <p className="empty-copy">No matching assets found.</p> : null}
            {results.map((asset) => {
              const isSelected = selectedAsset?.symbol === asset.symbol && selectedAsset?.provider === asset.provider;
              return (
                <button type="button" className={isSelected ? "asset-result active" : "asset-result"} key={`${asset.provider}-${asset.symbol}-${asset.exchange}`} onClick={() => selectAsset(asset)}>
                  <strong>{asset.symbol}</strong>
                  <span>{asset.name}</span>
                  <small>{asset.type || "asset"} | {asset.exchange || "unknown exchange"} | {asset.currency || snapshot.baseCurrency}</small>
                </button>
              );
            })}
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Portfolio assets</p>
              <h3>Select from current holdings</h3>
            </div>
          </div>
          <div className="asset-result-list">
            {snapshot.positions.map((item) => (
              <button type="button" className={selectedPosition?.position.id === item.position.id ? "asset-result active" : "asset-result"} key={item.position.id} onClick={() => selectAsset(fallbackAsset(item))}>
                <strong>{item.position.symbol}</strong>
                <span>{item.position.name}</span>
                <small>{item.currentWeightPct.toFixed(1)}% weight | {item.position.instrumentType}</small>
              </button>
            ))}
          </div>
        </section>
      </section> : null}

      <section className="metric-grid">
        <MetricTile label="Selected price" value={Number.isFinite(displayedPrice) ? `${displayedPrice.toFixed(2)} ${displayedCurrency}` : "n/a"} helper={quote?.fetchedAt ? new Date(quote.fetchedAt).toLocaleString("de-DE") : "Loaded portfolio price"} />
        <MetricTile label="Day change" value={Number.isFinite(quote?.changePercent) ? `${quote?.changePercent?.toFixed(2)}%` : "n/a"} tone={(quote?.changePercent || 0) >= 0 ? "positive" : "danger"} />
        <MetricTile label="Previous close" value={Number.isFinite(quote?.previousClose) ? `${quote?.previousClose?.toFixed(2)} ${displayedCurrency}` : "n/a"} />
        <MetricTile label="History points" value={history?.points.length || 0} helper={history?.range || range} />
        <MetricTile label="Live source" value={quote ? "Configured" : "Fallback"} helper={quote?.source || selectedPosition?.position.source || "No live quote"} />
        <MetricTile label="FX converted" value={quote?.converted ? "Yes" : "No"} helper={quote?.fxRate ? `FX ${quote.fxRate}` : snapshot.baseCurrency} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Price history</p>
              <h3>{selectedAsset?.symbol || "No asset selected"}</h3>
            </div>
            <div className="segmented compact-segmented">
              {["1M", "6M", "1Y", "5Y"].map((item) => (
                <button key={item} type="button" className={range === item ? "active" : ""} onClick={() => changeRange(item)}>{item}</button>
              ))}
            </div>
          </div>
          <HistoryLineChart points={history?.points || []} currency={history?.currency || displayedCurrency} />
        </div>

        <form className="panel research-form">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tax-aware switch analysis</p>
              <h3>Sell, rebuy, or switch hurdle</h3>
            </div>
            <Calculator size={20} aria-hidden="true" />
          </div>
          <div className="field-grid two">
            <label><span>Shares</span><input value={calc.shares} onChange={(event) => setCalc((current) => ({ ...current, shares: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Total cost basis</span><input value={calc.costBasis} onChange={(event) => setCalc((current) => ({ ...current, costBasis: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Current price</span><input value={calc.currentPrice} onChange={(event) => setCalc((current) => ({ ...current, currentPrice: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Sell size</span><input value={calc.sellPct} onChange={(event) => setCalc((current) => ({ ...current, sellPct: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Transaction cost</span><input value={calc.transactionCost} onChange={(event) => setCalc((current) => ({ ...current, transactionCost: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Tax rate</span><input value={calc.taxRate} onChange={(event) => setCalc((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Hold return %</span><input value={calc.expectedOldReturn} onChange={(event) => setCalc((current) => ({ ...current, expectedOldReturn: event.target.value }))} inputMode="decimal" /></label>
            <label><span>New return %</span><input value={calc.expectedNewReturn} onChange={(event) => setCalc((current) => ({ ...current, expectedNewReturn: event.target.value }))} inputMode="decimal" /></label>
          </div>
          <div className="calc-result-grid">
            <div><span>Sell value</span><strong>{calculation.sellValue.toFixed(2)} {snapshot.baseCurrency}</strong></div>
            <div><span>Estimated tax</span><strong>{calculation.taxDue.toFixed(2)} {snapshot.baseCurrency}</strong></div>
            <div><span>Cash after tax</span><strong>{calculation.cashAfterTax.toFixed(2)} {snapshot.baseCurrency}</strong></div>
            <div><span>Break-even rebuy</span><strong>{Number.isFinite(calculation.breakEvenRebuy) ? calculation.breakEvenRebuy.toFixed(2) : "n/a"} {snapshot.baseCurrency}</strong></div>
            <div><span>Required new return</span><strong>{Number.isFinite(calculation.requiredNewReturn) ? `${calculation.requiredNewReturn.toFixed(2)}%` : "n/a"}</strong></div>
            <div><span>Switch edge</span><strong>{calculation.switchEdge.toFixed(2)} {snapshot.baseCurrency}</strong></div>
          </div>
        </form>
      </section>
    </div>
  );
}
