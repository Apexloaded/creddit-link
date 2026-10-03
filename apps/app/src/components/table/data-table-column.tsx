"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";

export function ColumnHeaderRight({
  children,
  className,
  ...props
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-right", className)} {...props}>
      {children}
    </div>
  );
}

export function ColumnHeaderLeft({
  children,
  className,
  ...props
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-left", className)} {...props}>
      {children}
    </div>
  );
}

const tones = {
  default:
    "text-foreground hover:bg-background hover:text-foreground dark:text-slate-300",
  danger: "text-red-600 hover:bg-destructive/40 hover:text-destructive",
  success: "text-emerald-600 bg-emerald-100/40 hover:bg-emerald-400/40 hover:text-emerald-600",
} as const;

export function ColumnActionButton({
  label,
  icon: Icon,
  onClick,
  tone = "default",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  tone?: keyof typeof tones;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          type="button"
          variant={"ghost"}
          size={"icon"}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={`${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={"w-auto"}>
        <p className="text-center">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
