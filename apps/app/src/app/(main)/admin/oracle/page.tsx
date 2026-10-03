"use client";

import { useState } from "react";
import { useMockAggregator } from "@/hooks/contracts/use-mock-aggregator";
import {
  Clock,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Copy,
  Layers,
} from "lucide-react";
import { useCredditAddresses } from "@/hooks";
import { Tokens } from "@/config";

export default function MockOracleAdmin() {
  const [selectedToken, setSelectedToken] = useState<Tokens>(Tokens.USDG);
  const { getToken } = useCredditAddresses();

  // Get the feed/token address based on the selected enum value
  const feedAddress = getToken(selectedToken);

  const [inputPrice, setInputPrice] = useState("150.00");
  const [stalenessHours, setStalenessHours] = useState("72");
  const [copied, setCopied] = useState(false);

  const {
    state,
    isLoading,
    isPending,
    setPrice,
    setUpdatedAt,
    refreshTimestampToNow,
    triggerIncompleteRound,
  } = useMockAggregator(feedAddress);

  const copyAddress = () => {
    if (!feedAddress) return;
    navigator.clipboard.writeText(feedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMakeStale = async () => {
    if (!state) return;
    const hoursInSeconds = BigInt(parseFloat(stalenessHours) * 3600);
    const staleTime = state.updatedAt - hoursInSeconds;
    await setUpdatedAt(staleTime);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-xl border border-border text-muted-foreground animate-pulse flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span>Syncing Oracle state from chain...</span>
      </div>
    );
  }

  // Calculate staleness badge helper
  const now = Math.floor(Date.now() / 1000);
  const ageInSeconds = state ? now - Number(state.updatedAt) : 0;
  const isStale = ageInSeconds > 3600; // Consider > 1 hour stale for UI feedback

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border shadow-xl text-card-foreground rounded-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground">
              Mock Oracle Admin
            </h3>
            {feedAddress && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {feedAddress.slice(0, 6)}...{feedAddress.slice(-4)}
                </span>
                <button
                  onClick={copyAddress}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy full address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Tag */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStale ? "bg-warning" : "bg-success"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStale ? "bg-warning" : "bg-success"
              }`}
            ></span>
          </span>
          <span className="text-xs font-medium text-foreground">
            {isStale ? "Stale Data" : "Live"}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {/* Token Selector Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Asset / Token
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value as Tokens)}
            className="w-full bg-background border border-input text-foreground text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring cursor-pointer"
          >
            {Object.values(Tokens).map((token) => (
              <option key={token} value={token} className="bg-popover text-popover-foreground">
                {token}
              </option>
            ))}
          </select>
        </div>

        {/* On-Chain Metrics Dashboard Grid */}
        {state && (
          <div className="grid grid-cols-2 gap-3">
            {/* Price Metric Card */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
                <span>Current Price</span>
                <DollarSign className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-success">
                ${state.formattedPrice}
              </div>
            </div>

            {/* Timestamp Metric Card */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
                <span>Last Updated</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                {new Date(Number(state.updatedAt) * 1000).toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(Number(state.updatedAt) * 1000).toLocaleDateString()}
              </div>
            </div>

            {/* Round Metadata */}
            <div className="col-span-2 p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Round ID:</span>
                <span className="font-mono text-foreground font-medium">
                  {state.roundId.toString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Answered In Round:</span>
                <span className="font-mono text-foreground font-medium">
                  {state.answeredInRound.toString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls Section */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            Simulation & Testing Actions
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Control 1: Update Price */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
              <label className="block text-xs font-medium text-foreground">
                Set Custom Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg pl-7 pr-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <button
                disabled={isPending}
                onClick={() => setPrice(inputPrice)}
                className="w-full py-2 px-3 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-medium transition-opacity flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPending && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                {isPending ? "Updating..." : "Update Price"}
              </button>
            </div>

            {/* Control 2: Staleness Simulation */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
              <label className="block text-xs font-medium text-foreground">
                Simulate Staleness (Hours)
              </label>
              <input
                type="number"
                value={stalenessHours}
                onChange={(e) => setStalenessHours(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
              <button
                disabled={isPending}
                onClick={handleMakeStale}
                className="w-full py-2 px-3 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-warning border border-warning/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Force Stale Timestamp
              </button>
            </div>
          </div>

          {/* Quick Utility & Fault Testing Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              disabled={isPending}
              onClick={() => refreshTimestampToNow()}
              className="flex-1 py-2.5 px-4 bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-50 text-secondary-foreground rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              Reset Timestamp to Block Time
            </button>

            <button
              disabled={isPending}
              onClick={() => triggerIncompleteRound()}
              className="flex-1 py-2.5 px-4 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 disabled:opacity-50 text-destructive rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Trigger Round Error
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}