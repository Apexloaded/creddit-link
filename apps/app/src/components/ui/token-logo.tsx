import { Stock, toRhLogo } from "@/config";

export function TokenLogo({
  symbol,
  size = 20,
  className = "",
}: {
  symbol: Stock;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toRhLogo(symbol)}
      alt={symbol}
      title={symbol}
      width={size}
      height={size}
      className={`rounded-full bg-white object-cover ring-2 ring-white dark:ring-slate-900 ${className}`}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
