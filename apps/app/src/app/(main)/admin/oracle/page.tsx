"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  Link2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCredditAddresses } from "@/hooks";
import { Tokens } from "@/config";
import { Address, isAddress } from "viem";
import { toast } from "sonner";
import {
  MAX_STALENESS_SECONDS,
  MIN_STALENESS_SECONDS,
  useCredditOracle,
} from "@/hooks/contracts/use-creddit-oracle";
import { useCredditAssetRegistry } from "@/hooks/contracts/use-creddit-asset-registry";

type FeedFormState = {
  asset: string;
  feed: string;
  stalenessThreshold: string;
};

const DEFAULT_FEED_FORM: FeedFormState = {
  asset: "",
  feed: "",
  stalenessThreshold: "3600",
};

function compactAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function MockOracleAdmin() {
  const [selectedToken, setSelectedToken] = useState<Tokens>(Tokens.USDG);
  const { getPriceFeed, getToken } = useCredditAddresses();
  const { useListAssets } = useCredditAssetRegistry();
  const { useGetFeed, useSetFeed } = useCredditOracle();
  const { data: registeredAssets, isLoading: isAssetsLoading } =
    useListAssets(false);
  const {
    setFeed,
    isProcessing: isSettingFeed,
    error: setFeedError,
  } = useSetFeed();

  console.log("REGISTERED ASSETS :: ", registeredAssets);
  
  // Get the feed/token address based on the selected enum value
  const feedAddress = getPriceFeed(selectedToken);
  const selectedTokenAddress = getToken(selectedToken);

  const [inputPrice, setInputPrice] = useState("150.00");
  const [stalenessHours, setStalenessHours] = useState("72");
  const [copied, setCopied] = useState(false);
  const [nowSeconds, setNowSeconds] = useState(0);
  const [feedForm, setFeedForm] = useState<FeedFormState>({
    ...DEFAULT_FEED_FORM,
    asset: selectedTokenAddress,
    feed: feedAddress,
  });
  const [feedTxHash, setFeedTxHash] = useState<string | null>(null);

  const knownTokens = useMemo(
    () =>
      Object.values(Tokens).map((token) => ({
        symbol: token,
        asset: getToken(token),
        feed: getPriceFeed(token),
      })),
    [getPriceFeed, getToken],
  );

  const selectedFeedAsset = isAddress(feedForm.asset)
    ? (feedForm.asset as Address)
    : undefined;
  const { data: configuredFeed, isLoading: isFeedLoading } =
    useGetFeed(selectedFeedAsset);

  const {
    state,
    isLoading,
    isPending,
    setPrice,
    setUpdatedAt,
    refreshTimestampToNow,
    triggerIncompleteRound,
  } = useMockAggregator(feedAddress);

  useEffect(() => {
    const syncTime = () => setNowSeconds(Math.floor(Date.now() / 1000));
    syncTime();

    const intervalId = window.setInterval(syncTime, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  const setFeedField = (key: keyof FeedFormState, value: string) => {
    setFeedForm((current) => ({ ...current, [key]: value }));
  };

  const handleAssetSelect = (value: string) => {
    if (value === "custom") {
      setFeedForm((current) => ({ ...current, asset: "", feed: "" }));
      return;
    }

    const known = knownTokens.find((token) => token.asset === value);
    setFeedForm((current) => ({
      ...current,
      asset: value,
      feed: known?.feed ?? current.feed,
    }));
  };

  const feedValidation = useMemo(() => {
    if (!isAddress(feedForm.asset)) return "Enter a valid asset address.";
    if (!isAddress(feedForm.feed)) return "Enter a valid price feed address.";

    const threshold = Number(feedForm.stalenessThreshold);
    if (!Number.isInteger(threshold)) {
      return "Staleness threshold must be a whole number of seconds.";
    }
    if (
      threshold < MIN_STALENESS_SECONDS ||
      threshold > MAX_STALENESS_SECONDS
    ) {
      return `Staleness threshold must be between ${MIN_STALENESS_SECONDS} and ${MAX_STALENESS_SECONDS} seconds.`;
    }

    return null;
  }, [feedForm]);

  const handleSetFeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (feedValidation) {
      toast.error(feedValidation);
      return;
    }

    const toastId = toast.loading("Submitting feed configuration...");

    try {
      const receipt = await setFeed({
        asset: feedForm.asset as Address,
        feed: feedForm.feed as Address,
        stalenessThreshold: BigInt(feedForm.stalenessThreshold),
      });

      setFeedTxHash(receipt.transactionHash);
      toast.success("Oracle feed configured.", { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message, { id: toastId });
    }
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
  const ageInSeconds = state ? nowSeconds - Number(state.updatedAt) : 0;
  const isStale = ageInSeconds > 3600; // Consider > 1 hour stale for UI feedback

  return (
    <div className="w-full max-w-6xl mx-auto bg-card border border-border shadow-xl text-card-foreground rounded-xl overflow-hidden font-sans">
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
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
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
                <option
                  key={token}
                  value={token}
                  className="bg-popover text-popover-foreground"
                >
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
                  {new Date(
                    Number(state.updatedAt) * 1000,
                  ).toLocaleTimeString()}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(
                    Number(state.updatedAt) * 1000,
                  ).toLocaleDateString()}
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

        <form
          onSubmit={handleSetFeed}
          className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Configure Asset Feed
              </h4>
              <p className="text-xs text-muted-foreground">
                Map a registered asset to a Chainlink-compatible feed.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Registered Asset
            </label>
            <select
              value={
                registeredAssets?.some(
                  (asset) =>
                    asset.token.toLowerCase() === feedForm.asset.toLowerCase(),
                )
                  ? feedForm.asset
                  : "custom"
              }
              onChange={(event) => handleAssetSelect(event.target.value)}
              className="w-full cursor-pointer rounded-lg border border-input bg-background p-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="custom">Custom asset address</option>
              {registeredAssets?.map((asset) => {
                const known = knownTokens.find(
                  (token) =>
                    token.asset.toLowerCase() === asset.token.toLowerCase(),
                );

                return (
                  <option key={asset.token} value={asset.token}>
                    {known?.symbol ?? compactAddress(asset.token)}
                  </option>
                );
              })}
            </select>
            <input
              value={feedForm.asset}
              onChange={(event) => setFeedField("asset", event.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Price Feed
            </label>
            <input
              value={feedForm.feed}
              onChange={(event) => setFeedField("feed", event.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Staleness Threshold
            </label>
            <div className="relative">
              <input
                type="number"
                min={MIN_STALENESS_SECONDS}
                max={MAX_STALENESS_SECONDS}
                step="1"
                value={feedForm.stalenessThreshold}
                onChange={(event) =>
                  setFeedField("stalenessThreshold", event.target.value)
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-16 font-mono text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                SEC
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 text-xs">
            {isAssetsLoading || isFeedLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading oracle config...
              </div>
            ) : configuredFeed?.isConfigured ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Feed already configured
                </div>
                <div className="font-mono text-muted-foreground">
                  {compactAddress(configuredFeed.feed)}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                No feed configured for this asset yet.
              </div>
            )}
          </div>

          <div
            className={`rounded-lg border p-3 text-xs ${
              feedValidation
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-success/30 bg-success/10 text-success"
            }`}
          >
            {feedValidation ?? "Ready to configure this feed."}
          </div>

          {(setFeedError || feedTxHash) && (
            <div className="rounded-lg border border-border bg-background p-3 text-xs">
              {feedTxHash && (
                <div className="font-mono text-success">
                  {feedTxHash.slice(0, 10)}...{feedTxHash.slice(-8)}
                </div>
              )}
              {setFeedError && (
                <div className="mt-1 text-destructive">
                  {setFeedError.message}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSettingFeed || Boolean(feedValidation)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSettingFeed ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {isSettingFeed ? "Configuring..." : "Set Feed"}
          </button>
        </form>
      </div>
    </div>
  );
}
