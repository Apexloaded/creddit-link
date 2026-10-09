"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Address, formatUnits, isAddress, parseUnits } from "viem";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  DatabaseZap,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Contracts, Tokens } from "@/config";
import { useCredditAddresses } from "@/hooks";
import { useCredditAssetRegistry } from "@/hooks/contracts/use-creddit-asset-registry";

type FormState = {
  token: string;
  collateralFactorBps: string;
  liquidationThresholdBps: string;
  liquidationPenaltyBps: string;
  liquidationBonusBps: string;
  maxExposure: string;
  decimals: string;
};

const DEFAULT_FORM: FormState = {
  token: "",
  collateralFactorBps: "7000",
  liquidationThresholdBps: "8000",
  liquidationPenaltyBps: "1000",
  liquidationBonusBps: "500",
  maxExposure: "1000000",
  decimals: "18",
};

function toInteger(value: string) {
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  return Number(value);
}

function formatBps(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

function compactHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function MockRegistryAdmin() {
  const { chainId, getContract, getToken } = useCredditAddresses();
  const registryAddress = getContract(Contracts.REGISTRY);
  const { useListAssets, useAddAsset, useRemoveAsset } =
    useCredditAssetRegistry();
  const { data: assets, isLoading, refetch } = useListAssets(false);
  const { addAsset, isProcessing, error } = useAddAsset();
  const {
    removeAsset,
    isProcessing: isRemoving,
    error: removeError,
  } = useRemoveAsset();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedToken, setSelectedToken] = useState("custom");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [removeTxHash, setRemoveTxHash] = useState<string | null>(null);
  const [removingToken, setRemovingToken] = useState<Address | null>(null);
  const [copied, setCopied] = useState(false);

  const knownTokens = useMemo(
    () =>
      Object.values(Tokens).map((token) => ({
        symbol: token,
        address: getToken(token),
      })),
    [getToken],
  );

  const listedTokenSet = useMemo(
    () => new Set((assets ?? []).map((asset) => asset.token.toLowerCase())),
    [assets],
  );

  const formValidation = useMemo(() => {
    const collateralFactorBps = toInteger(form.collateralFactorBps);
    const liquidationThresholdBps = toInteger(form.liquidationThresholdBps);
    const liquidationPenaltyBps = toInteger(form.liquidationPenaltyBps);
    const liquidationBonusBps = toInteger(form.liquidationBonusBps);
    const decimals = toInteger(form.decimals);

    if (!isAddress(form.token)) return "Enter a valid ERC20 token address.";
    if (listedTokenSet.has(form.token.toLowerCase())) {
      return "This token is already listed in the registry.";
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
      return "Decimals must be an integer between 0 and 30.";
    }
    if (!form.maxExposure || Number(form.maxExposure) <= 0) {
      return "Max exposure must be greater than zero.";
    }
    if (!Number.isInteger(collateralFactorBps) || collateralFactorBps <= 0) {
      return "Collateral factor must be a positive BPS value.";
    }
    if (collateralFactorBps > 8500) {
      return "Collateral factor cannot exceed 8500 BPS.";
    }
    if (
      !Number.isInteger(liquidationThresholdBps) ||
      liquidationThresholdBps <= 0
    ) {
      return "Liquidation threshold must be a positive BPS value.";
    }
    if (liquidationThresholdBps < collateralFactorBps + 500) {
      return "Liquidation threshold must be at least 500 BPS above collateral factor.";
    }
    if (liquidationThresholdBps > 10000) {
      return "Liquidation threshold cannot exceed 10000 BPS.";
    }
    if (
      !Number.isInteger(liquidationPenaltyBps) ||
      liquidationPenaltyBps < 200 ||
      liquidationPenaltyBps > 1500
    ) {
      return "Liquidation penalty must be between 200 and 1500 BPS.";
    }
    if (
      !Number.isInteger(liquidationBonusBps) ||
      liquidationBonusBps > liquidationPenaltyBps
    ) {
      return "Liquidation bonus must be a BPS value no higher than the penalty.";
    }

    return null;
  }, [form, listedTokenSet]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTokenSelect = (value: string) => {
    setSelectedToken(value);

    if (value === "custom") {
      setField("token", "");
      return;
    }

    const preset = knownTokens.find((token) => token.symbol === value);
    if (preset) setField("token", preset.address);
  };

  const copyRegistryAddress = () => {
    navigator.clipboard.writeText(registryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formValidation) {
      toast.error(formValidation);
      return;
    }

    const decimals = toInteger(form.decimals);
    const toastId = toast.loading("Submitting asset listing transaction...");

    try {
      const receipt = await addAsset({
        token: form.token as Address,
        collateralFactorBps: toInteger(form.collateralFactorBps),
        liquidationThresholdBps: toInteger(form.liquidationThresholdBps),
        liquidationPenaltyBps: toInteger(form.liquidationPenaltyBps),
        liquidationBonusBps: toInteger(form.liquidationBonusBps),
        maxExposure: parseUnits(form.maxExposure, decimals),
        decimals,
      });

      setTxHash(receipt.transactionHash);
      toast.success("Asset added to the registry.", { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message, { id: toastId });
    }
  };

  const handleRemoveAsset = async (token: Address) => {
    const confirmed = window.confirm(
      `Remove asset ${token} from the registry? This will mark it unlisted and disabled.`,
    );
    if (!confirmed) return;

    const toastId = toast.loading("Submitting asset removal transaction...");
    setRemovingToken(token);

    try {
      const receipt = await removeAsset(token);
      setRemoveTxHash(receipt.transactionHash);
      toast.success("Asset removed from the registry.", { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message, { id: toastId });
    } finally {
      setRemovingToken(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/40 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Mock Registry Admin
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {registryAddress.slice(0, 6)}...{registryAddress.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={copyRegistryAddress}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy registry address"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <span className="text-muted-foreground">Chain</span>
              <span className="ml-2 font-mono font-medium text-foreground">
                {chainId}
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(event) => handleTokenSelect(event.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-input bg-background p-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="custom">Custom token address</option>
                  {knownTokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.address}
                    </option>
                  ))}
                </select>
                <input
                  value={form.token}
                  onChange={(event) => {
                    setSelectedToken("custom");
                    setField("token", event.target.value);
                  }}
                  placeholder="0x..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Field
                label="Collateral Factor"
                suffix="BPS"
                value={form.collateralFactorBps}
                onChange={(value) => setField("collateralFactorBps", value)}
              />
              <Field
                label="Liquidation Threshold"
                suffix="BPS"
                value={form.liquidationThresholdBps}
                onChange={(value) => setField("liquidationThresholdBps", value)}
              />
              <Field
                label="Liquidation Penalty"
                suffix="BPS"
                value={form.liquidationPenaltyBps}
                onChange={(value) => setField("liquidationPenaltyBps", value)}
              />
              <Field
                label="Liquidation Bonus"
                suffix="BPS"
                value={form.liquidationBonusBps}
                onChange={(value) => setField("liquidationBonusBps", value)}
              />
              <Field
                label="Max Exposure"
                value={form.maxExposure}
                onChange={(value) => setField("maxExposure", value)}
              />
              <Field
                label="Decimals"
                value={form.decimals}
                onChange={(value) => setField("decimals", value)}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                {formValidation ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                )}
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {formValidation ?? "Ready to add this asset."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contract limits: collateral factor {"<="} 8500 BPS,
                    threshold needs a 500 BPS safety margin, penalty 200-1500
                    BPS.
                  </p>
                </div>
              </div>
            </div>

            {(error || txHash || removeError || removeTxHash) && (
              <div className="rounded-xl border border-border bg-background p-3 text-xs">
                {txHash && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-mono">
                      Added {compactHash(txHash)}
                    </span>
                  </div>
                )}
                {removeTxHash && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-mono">
                      Removed {compactHash(removeTxHash)}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="mt-1 text-destructive">{error.message}</div>
                )}
                {removeError && (
                  <div className="mt-1 text-destructive">
                    {removeError.message}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || Boolean(formValidation)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isProcessing ? "Adding Asset..." : "Add Asset"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric
                icon={<DatabaseZap className="h-4 w-4 text-primary" />}
                label="Listed Assets"
                value={(assets?.length ?? 0).toString()}
              />
              <Metric
                icon={<CircleDollarSign className="h-4 w-4 text-success" />}
                label="Enabled"
                value={(assets ?? [])
                  .filter((asset) => asset.isEnabled)
                  .length.toString()}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20">
              <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registry Assets
              </div>
              <div className="max-h-[484px] overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading assets...
                  </div>
                ) : assets && assets.length > 0 ? (
                  <div className="divide-y divide-border">
                    {assets.map((asset) => (
                      <div key={asset.token} className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-foreground">
                              {asset.token.slice(0, 6)}...
                              {asset.token.slice(-4)}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {asset.decimals} decimals
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              asset.isEnabled
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {asset.isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <AssetStat
                            label="LTV"
                            value={formatBps(asset.collateralFactorBps)}
                          />
                          <AssetStat
                            label="Threshold"
                            value={formatBps(asset.liquidationThresholdBps)}
                          />
                          <AssetStat
                            label="Penalty"
                            value={formatBps(asset.liquidationPenaltyBps)}
                          />
                          <AssetStat
                            label="Exposure"
                            value={formatUnits(
                              asset.maxExposure,
                              asset.decimals,
                            )}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={() => handleRemoveAsset(asset.token)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Remove asset from registry"
                        >
                          {removingToken === asset.token ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {removingToken === asset.token
                            ? "Removing..."
                            : "Remove Asset"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No assets listed yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-14 font-mono text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

function AssetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}
