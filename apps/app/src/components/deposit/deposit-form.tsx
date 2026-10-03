"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import {
  ArrowUpDownIcon,
  ChevronsUpDownIcon,
  InfoIcon,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useCredditLine } from "@/hooks/contracts/use-creddit-line";
import { useCreddit } from "@/context/creddit.context";
import {
  depositSchemaResolver,
  DepositSchemaType,
} from "@/schemas/deposit.schema";
import { cn, formatCurrency } from "@/lib/utils";
import { CurrencyInputField } from "../ui/currency-input";

interface DepositFormProps {
  onClose: () => void;
}

export function DepositForm({ onClose }: DepositFormProps) {
  const searchParams = useSearchParams();
  const rawPositionParam = searchParams.get("position");

  const { assets, selectedAsset, setSelectedAsset, isListLoading, positions } =
    useCreddit();
  const { useDeposit } = useCredditLine();
  const { deposit, isProcessing, stepStatus } = useDeposit(
    selectedAsset?.token,
  );

  const {
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    control,
    formState: { errors },
  } = useForm<DepositSchemaType>({
    resolver: depositSchemaResolver,
    context: { maxBalance: selectedAsset?.balanceFormatted },
    defaultValues: { amount: "", positionId: undefined },
    mode: "onChange",
  });

  // Validate the position ID against user positions list
  const activePosition = useMemo(() => {
    if (!rawPositionParam || !positions?.length) return undefined;
    return positions.find(
      (pos: any) =>
        String(pos.id).toLowerCase() === rawPositionParam.toLowerCase(),
    );
  }, [rawPositionParam, positions]);

  // Keep form value synced with validated position ID
  useEffect(() => {
    if (activePosition) {
      setValue("positionId", activePosition.id.toString());
    } else {
      setValue("positionId", undefined);
    }
  }, [activePosition, setValue]);

  const amount = watch("amount");

  const calculatedUsdValue = useMemo(() => {
    const parsedAmount = parseFloat(amount || "0");
    const parsedPrice = parseFloat(selectedAsset?.usdPrice ?? "0");
    if (isNaN(parsedAmount) || parsedAmount <= 0 || isNaN(parsedPrice)) {
      return "0.00";
    }
    return (parsedAmount * parsedPrice).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amount, selectedAsset?.usdPrice]);

  useEffect(() => {
    const parsedAmount = parseFloat(amount || "0");
    const parsedBalance = parseFloat(selectedAsset?.balanceFormatted ?? "0");

    if (!amount) return;

    if (parsedAmount > parsedBalance) {
      setError("amount", {
        type: "balanceExceeded",
        message: "Amount exceeds available balance",
      });
    } else if (errors.amount?.type === "balanceExceeded") {
      clearErrors("amount");
    }
  }, [
    amount,
    selectedAsset?.balanceFormatted,
    setError,
    clearErrors,
    errors.amount?.type,
  ]);

  const isBalanceExceeded = errors.amount?.type === "within-balance";

  const handleSetMax = () => {
    if (selectedAsset?.balanceFormatted) {
      setValue("amount", String(selectedAsset.balanceFormatted), {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: DepositSchemaType) => {
    try {
      const receipt = await deposit({
        positionId: data.positionId,
        amount: data.amount,
      });
      console.log(receipt);
      onClose();
    } catch (error) {
      console.error("Deposit workflow failed or rejected:", error);
    }
  };

  const getButtonText = () => {
    if (stepStatus === "approving") return "1/2 Approving Token...";
    if (stepStatus === "depositing") return "2/2 Depositing...";
    if (isListLoading) return "Loading...";
    return "Deposit";
  };

  const isSubmitDisabled =
    !amount ||
    Boolean(errors.amount) ||
    isBalanceExceeded ||
    isListLoading ||
    isProcessing;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <p className="text-2xl font-semibold">Deposit Collateral</p>
        <p className="mt-1 text-foreground">
          Configure and deposit your collateral on Creddit Link
        </p>
      </div>

      {/* Position Banner UI */}
      {activePosition && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
          <ShieldAlert size={18} className="shrink-0" />
          <span>
            Depositing into existing position{" "}
            <strong>#{activePosition.id}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 bg-secondary rounded-3xl px-6 py-4 mt-1">
        <p className="text-sm font-medium">Deposit</p>
        <div className="flex justify-between items-center gap-2">
          <CurrencyInputField
            control={control}
            name="amount"
            className="md:text-5xl bg-transparent flex-1 text-primary h-14 p-0 rounded-none shadow-none focus-visible:ring-0 border-0 caret-primary"
          />

          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex gap-1 items-center transition-colors duration-200 hover:bg-background/80 cursor-pointer bg-background rounded-full px-3 py-2 select-none">
                <p className="text-md font-medium">
                  {selectedAsset?.symbol ?? "Select Asset"}
                </p>
                <ChevronsUpDownIcon size={15} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background">
              {assets.map((asset) => (
                <DropdownMenuItem
                  key={asset.token}
                  onClick={() => setSelectedAsset(asset)}
                  className={cn(
                    "flex justify-between focus:bg-secondary cursor-pointer",
                    selectedAsset?.token === asset.token && "bg-secondary",
                  )}
                >
                  <span className="font-medium">{asset.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(asset.balanceFormatted, false)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <ArrowUpDownIcon size={17} />
            <p>${calculatedUsdValue}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <p>Balance:</p>
              <p className="font-medium text-foreground">
                {formatCurrency(selectedAsset?.balanceFormatted ?? "0", false)}{" "}
                {selectedAsset?.symbol}
              </p>
            </div>
            <Button size={"xs"} onClick={handleSetMax} type="button">
              Max
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <p>Deposit LTV</p>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={15} className="opacity-50 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-center">
                  The maximum loan amount you can borrow against your deposited
                  collateral.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-medium">
            {selectedAsset?.collateralFactorBps ?? "0"}%
          </p>
        </div>
      </div>

      <div className="flex flex-col py-3 gap-2 bg-secondary rounded-3xl px-6 mt-3 text-sm">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <p>Use as collateral</p>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={15} className="opacity-50 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-center">
                  Enable this asset to be used as collateral for borrowing
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div>
            <Controller
              name="useAsCollateral"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <p>Collateral factor</p>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={15} className="opacity-50 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-center">
                  The percentage of your collateral that can be used to borrow
                  assets
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-medium">
            {selectedAsset?.collateralFactorBps ?? "0"}%
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <p>Liquidation threshold</p>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={15} className="opacity-50 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-center">
                  The threshold at which your collateral position becomes
                  eligible for liquidation.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-medium">
            {selectedAsset?.liquidationThresholdBps ?? "0"}%
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <p>Liquidation penalty</p>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon size={15} className="opacity-50 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-center">
                  The discount liquidators get when purchasing collateral during
                  liquidation.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-medium">
            {selectedAsset?.liquidationPenaltyBps ?? "0"}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <Button
          onClick={onClose}
          type="button"
          size={"xl"}
          variant={"outline"}
          className={"flex-1"}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          size={"xl"}
          className={"flex-1"}
        >
          {getButtonText()}
        </Button>
      </div>
    </form>
  );
}
