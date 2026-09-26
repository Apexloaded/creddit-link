export { cn } from "cn";

/**
 * Truncates any input value into a formatted string.
 * Supports standard text truncation and wallet address middle-truncation.
 */
export function truncate(
  value: unknown,
  options: {
    /** Total maximum length of the output string (including ellipsis). Default: 30 */
    length?: number;
    /** Custom ellipsis string. Default: '...' */
    ellipsis?: string;
    /** Number of characters to keep at the start (specifically for wallet/hash style truncation) */
    prefixKeep?: number;
    /** Number of characters to keep at the end (specifically for wallet/hash style truncation) */
    suffixKeep?: number;
  } = {},
): string {
  const { length = 30, ellipsis = "...", prefixKeep, suffixKeep } = options;

  // Handle null or undefined
  if (value === null || value === undefined) {
    return "";
  }

  // Convert objects/arrays to JSON strings, otherwise cast to String
  let str: string;
  if (typeof value === "object") {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Middle-truncation for wallet addresses / hashes when prefixKeep and suffixKeep are supplied
  if (typeof prefixKeep === "number" && typeof suffixKeep === "number") {
    const minLength = prefixKeep + suffixKeep + ellipsis.length;
    if (str.length <= minLength) {
      return str;
    }
    const prefix = str.slice(0, prefixKeep);
    const suffix = str.slice(-suffixKeep);
    return `${prefix}${ellipsis}${suffix}`;
  }

  // Auto-detect Ethereum / EVM wallet address format (0x followed by hex chars, length 42)
  if (
    prefixKeep === undefined &&
    suffixKeep === undefined &&
    /^0x[a-fA-F0-9]{40}$/.test(str)
  ) {
    return `${str.slice(0, 6)}${ellipsis}${str.slice(-4)}`;
  }

  // Standard tail truncation
  if (str.length <= length) {
    return str;
  }

  const truncatedLength = Math.max(0, length - ellipsis.length);
  return `${str.slice(0, truncatedLength)}${ellipsis}`;
}

/**
 * Converts basis points (e.g., 6500) to a display percentage.
 * @param bps - The basis points value from the contract (number or bigint)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted percentage string (e.g., "65.00%")
 */
export function formatBpsToPercent(
  bps: number | bigint,
  decimals: number = 2,
): string {
  const percentValue = bpsToRawPercent(bps);

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentValue / 100); // Intl.NumberFormat expects a decimal ratio (0.65 for 65%)
}

/**
 * Converts basis points (e.g., 6500) to a raw percentage value.
 * @param bps - The basis points value from the contract (number or bigint)
 * @returns Raw percentage value (e.g., 65.0 for 65%)
 */
export function bpsToRawPercent(bps: number | bigint): number {
  return Number(bps) / 100;
}

/**
 * Formats a number into a currency string with optional shortening.
 * @param value - The number to format
 * @param includeSymbol - Whether to include the currency symbol (default: true)
 * @param shorten - Whether to shorten the number to k, M, B, T etc. (default: false)
 * @returns Formatted currency string (e.g., "₦1,000,000.00" or "1M")
 */
export function formatCurrency(
  value: string | number,
  includeSymbol: boolean = true,
  shorten: boolean = false,
) {
  const cleanInp = value.toString().replace(/(,)/g, "");
  if (cleanInp.length < 1) return "";
  const numValue = Number(cleanInp);

  // Truncate (not round) to a fixed number of decimal places,
  // avoiding floating-point drift from raw multiplication.
  const truncateToDecimals = (num: number, decimals: number = 2) => {
    const factor = Math.pow(10, decimals);
    // Round to a safe number of digits first to kill float noise,
    // then truncate down to the target decimal count.
    const safe = Math.round(num * factor * 1000) / 1000; // fix float noise
    return Math.trunc(safe) / factor;
  };

  // Shorten value to 'k', 'M', 'B', 'T' etc., if needed
  let formattedValue = "";

  if (shorten) {
    if (numValue >= 1e12) {
      formattedValue = (numValue / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
    } else if (numValue >= 1e9) {
      formattedValue = (numValue / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    } else if (numValue >= 1e6) {
      formattedValue = (numValue / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    } else if (numValue >= 1e3) {
      formattedValue = (numValue / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    } else {
      formattedValue = numValue.toString();
    }
  } else {
    const truncated = truncateToDecimals(numValue, 2);

    const cur = Intl.NumberFormat("en-US", {
      style: includeSymbol ? "currency" : "decimal",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencySign: "accounting",
      signDisplay: "auto",
    });
    formattedValue = cur.format(truncated);
  }

  if (shorten) {
    formattedValue = includeSymbol ? "$" + formattedValue : formattedValue;
  }

  return formattedValue;
}
