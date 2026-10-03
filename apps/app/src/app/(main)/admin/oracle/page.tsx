"use client";

import React, { useState } from "react";
import { useMockAggregator } from "@/hooks/contracts/use-mock-aggregator";
import {
  Clock,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
} from "lucide-react";

export default function MockOracleAdmin({
  feedAddress = "0x8ef66290507B9f52F3418500C958fc22b2F08597",
}: {
  feedAddress: `0x${string}`;
}) {
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
      <div className="w-full max-w-2xl p-6 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 animate-pulse flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Syncing Oracle state from chain...</span>
      </div>
    );
  }

  // Calculate staleness badge helper
  const now = Math.floor(Date.now() / 1000);
  const ageInSeconds = state ? now - Number(state.updatedAt) : 0;
  const isStale = ageInSeconds > 3600; // Consider > 1 hour stale for UI feedback

  return (
    <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-xl text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">
              Mock Oracle Admin
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-slate-400">
                {feedAddress.slice(0, 6)}...{feedAddress.slice(-4)}
              </span>
              <button
                onClick={copyAddress}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy full address"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Status Tag */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStale ? "bg-amber-400" : "bg-emerald-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isStale ? "bg-amber-500" : "bg-emerald-500"
              }`}
            ></span>
          </span>
          <span className="text-xs font-medium text-slate-300">
            {isStale ? "Stale Data" : "Live"}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {/* On-Chain Metrics Dashboard Grid */}
        {state && (
          <div className="grid grid-cols-2 gap-3">
            {/* Price Metric Card */}
            <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Current Price</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                ${state.formattedPrice}
              </div>
            </div>

            {/* Timestamp Metric Card */}
            <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Last Updated</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200">
                {new Date(Number(state.updatedAt) * 1000).toLocaleTimeString()}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {new Date(Number(state.updatedAt) * 1000).toLocaleDateString()}
              </div>
            </div>

            {/* Round Metadata */}
            <div className="col-span-2 p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Round ID:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {state.roundId.toString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Answered In Round:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {state.answeredInRound.toString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls Section */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
            Simulation & Testing Actions
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Control 1: Update Price */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Set Custom Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
              <button
                disabled={isPending}
                onClick={() => setPrice(inputPrice)}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPending && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                {isPending ? "Updating..." : "Update Price"}
              </button>
            </div>

            {/* Control 2: Staleness Simulation */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Simulate Staleness (Hours)
              </label>
              <input
                type="number"
                value={stalenessHours}
                onChange={(e) => setStalenessHours(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              <button
                disabled={isPending}
                onClick={handleMakeStale}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
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
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              Reset Timestamp to Block Time
            </button>

            <button
              disabled={isPending}
              onClick={() => triggerIncompleteRound()}
              className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-50 text-rose-400 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
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
