"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  ArrowUpDownIcon,
  ChevronsUpDownIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDepositCollateral } from "@/hooks/contracts/use-credit-line";
import { useApp } from "@/context/app.context";

export default function DepositCollateral() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [amount, setAmount] = useState<string>("");
  const [useAsCollateral, setUseAsCollateral] = useState<boolean>(true);
  const { assets, selectedAsset, setSelectedAsset, isListLoading } = useApp();

  const { handleDepositFlow, isProcessing, stepStatus } = useDepositCollateral(
    selectedAsset?.token,
    amount,
  );

  const handleClose = () => {
    setOpen(false);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.history.length > 2) {
        router.back();
      } else {
        router.push("/");
      }
    }, 150);
  };

  // Dynamically calculate total USD value of entered token amount
  const calculatedUsdValue = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    const parsedPrice = parseFloat(selectedAsset?.usdPrice ?? "0");
    if (isNaN(parsedAmount) || parsedAmount <= 0 || isNaN(parsedPrice)) {
      return "0.00";
    }

    return (parsedAmount * parsedPrice).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amount, selectedAsset?.usdPrice]);

  // Handle Max button click
  const handleSetMax = () => {
    if (selectedAsset?.balanceFormatted) {
      setAmount(selectedAsset.balanceFormatted);
    }
  };

  // Basic validation check for deposit action
  const isDepositDisabled = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    const parsedBalance = parseFloat(selectedAsset?.balanceFormatted ?? "0");

    return (
      !amount ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > parsedBalance
    );
  }, [amount, selectedAsset?.balanceFormatted]);

  const onDeposit = async () => {
    try {
      await handleDepositFlow();
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed! top-0! left-0! inset-0! z-50!",
          "h-screen! w-screen! max-w-none!",
          "translate-x-0! translate-y-0!",
          "rounded-none! border-none! shadow-none!",
          "bg-background! p-6",
        )}
      >
        {/* Custom Top-Left Close Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClose}
          type="button"
          className="absolute top-4 left-4 bg-secondary"
          aria-label="Close"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <DialogTitle className="sr-only">Deposit Collateral</DialogTitle>

        {/* Modal Body */}
        <div className="flex flex-col gap-3 mx-auto max-w-lg w-full pt-12">
          <div>
            <p className="text-2xl font-semibold">Deposit Collateral</p>
            <p className="mt-1 text-foreground">
              Configure and deposit your collateral on Creddit Link
            </p>
          </div>

          <div className="flex flex-col gap-2 bg-accent rounded-3xl px-6 py-4 mt-3">
            <p className="text-sm font-medium">Deposit</p>
            <div className="flex justify-between items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="md:text-5xl flex-1 text-primary h-14 p-0 rounded-none shadow-none focus-visible:ring-0 border-0 caret-primary"
                placeholder="0.00"
              />

              {/* Asset Selector Dropdown */}
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
                      className="flex justify-between focus:bg-secondary cursor-pointer"
                    >
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        Bal: {asset.balanceFormatted}
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
                    {selectedAsset?.balanceFormatted ?? "0"}
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
                      The maximum loan amount you can borrow against your
                      deposited collateral.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-medium">
                {selectedAsset?.collateralFactorBps ?? "0"}%
              </p>
            </div>
          </div>

          <div className="flex flex-col py-3 gap-2 bg-accent rounded-3xl px-6 mt-3 text-sm">
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
                <Switch
                  checked={useAsCollateral}
                  onCheckedChange={setUseAsCollateral}
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
                      The percentage of your collateral that can be used to
                      borrow assets
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
                      The discount liquidators get when purchasing collateral
                      during liquidation.
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
              onClick={handleClose}
              type="button"
              size={"xl"}
              variant={"outline"}
              className={"flex-1"}
            >
              Cancel
            </Button>
            <Button
              onClick={onDeposit}
              type="button"
              disabled={isDepositDisabled || isListLoading || isProcessing}
              size={"xl"}
              className={"flex-1"}
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
