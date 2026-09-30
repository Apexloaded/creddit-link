import { ORACLE_PRICE_DECIMALS, TOKEN_DECIMALS } from "@/config/contract.config";
import { FormattedAmount } from "@/interfaces/asset.interface";
import { formatUnits, parseUnits } from "viem";

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
  value: string | number | null | undefined,
  includeSymbol: boolean = true,
  shorten: boolean = false,
) {
  if (value === null || value === undefined || value === "") return "";

  // 1. Clean the price first (removes commas, normalizes European decimals)
  const cleaned = cleanPrice(value);

  // 2. Return empty string if input contains no digits or is just a trailing dot (e.g. "100.")
  if (!cleaned || cleaned === ".") return "";

  const numValue = Number(cleaned);

  // 3. Safety check against invalid input
  if (isNaN(numValue)) return "";

  const truncateToDecimals = (num: number, decimals: number = 2) => {
    const factor = Math.pow(10, decimals);
    const safe = Math.round(num * factor * 1000) / 1000;
    return Math.trunc(safe) / factor;
  };

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

/**
 * Parses a string amount into a BigInt, handling decimals and validation.
 * @param amount - The amount string to parse.
 * @param decimals - The number of decimals for the token.
 * @returns Parsed amount as BigInt, or 0 if invalid.
 */
export function parseAmount(
  amount: string,
  decimals: number = TOKEN_DECIMALS.USDG,
) {
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return BigInt(0);
  }
  try {
    return parseUnits(amount, decimals);
  } catch {
    return BigInt(0);
  }
}

/**
 * Strips all non-numeric characters from a price input string.
 *
 * @param input - The raw price string (e.g., "$1,234.50", "USD 500")
 * @param allowDecimal - Whether to preserve the decimal point (default: true)
 * @returns A cleaned numeric string (e.g., "1234.50" or "123450")
 */
export function cleanPrice(
  input: string | number | null | undefined,
  allowDecimal = true,
): string {
  if (input === null || input === undefined) return "";

  let strInput = String(input).trim();

  if (!allowDecimal) {
    return strInput.replace(/\D/g, "");
  }

  // 1. Detect European format (e.g. "1.234,56" or "1000,50") where comma is the decimal
  // If there's a comma near the end followed by 1 or 2 digits, treat comma as decimal dot.
  const isEuropeanDecimal = /,\d{1,2}$/.test(strInput);

  if (isEuropeanDecimal) {
    // Strip thousands dots (1.234,50 -> 1234,50) then normalize comma to dot
    strInput = strInput.replace(/\./g, "").replace(",", ".");
  } else {
    // Standard US format (10,000.00 -> 10000.00): strip thousands commas
    strInput = strInput.replace(/,/g, "");
  }

  // 2. Keep only digits and dots
  const cleaned = strInput.replace(/[^0-9.]/g, "");

  // 3. Keep only the first dot if multiple dots exist (e.g. typing "10..5")
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join("")}`;
  }

  return cleaned;
}

export function toFormattedAmount(
  raw: bigint,
  decimals = ORACLE_PRICE_DECIMALS,
  customFormat?: string,
): FormattedAmount {
  return {
    raw,
    formatted: customFormat ?? formatUnits(raw, decimals),
  };
}

export function truncateForMaxDecimals(
  clean: string,
  maxDecimals: number,
): string {
  if (!clean.includes(".")) return clean;
  const [intPart, decPart] = clean.split(".");
  return `${intPart}.${decPart.slice(0, maxDecimals)}`;
}

export function anchorsBeforeCaret(str: string, caret: number): number {
  let count = 0;
  for (let i = 0; i < caret && i < str.length; i++) {
    if (/[\d.]/.test(str[i])) count++;
  }
  return count;
}

export function caretAfterAnchors(str: string, anchorCount: number): number {
  if (anchorCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (/[\d.]/.test(str[i])) {
      count++;
      if (count === anchorCount) return i + 1;
    }
  }
  return str.length;
}

export function cleanNumericInput(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();
  if (str === "") return "";

  str = str.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (str === "") return "";

  const parts = str.split(".");
  if (parts.length > 2) str = `${parts[0]}.${parts.slice(1).join("")}`;

  const [intRaw, decRaw] = str.split(".");
  let intPart = intRaw.replace(/^0+(?=\d)/, "");

  // Always normalize an empty integer part to "0" when a decimal exists —
  // keeps the stored value schema/contract-safe ("0.5", never ".5").
  if (decRaw !== undefined && intPart === "") intPart = "0";
  else if (intPart === "") intPart = str.startsWith("0") ? "0" : "";

  return decRaw !== undefined ? `${intPart}.${decRaw}` : intPart;
}

export function formatNumericInput(
  value: string | number | null | undefined,
  maxDecimals?: number,
): string {
  let clean = cleanNumericInput(value);
  if (clean === "") return "";

  if (maxDecimals !== undefined && clean.includes(".")) {
    const [i, d] = clean.split(".");
    clean = `${i}.${d.slice(0, maxDecimals)}`;
  }

  const hasTrailingDot = clean.endsWith(".");
  const [intPart, decPart] = clean.split(".");
  const formattedInt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== undefined) return `${formattedInt}.${decPart}`;
  return hasTrailingDot ? `${formattedInt}.` : formattedInt;
}

export function addressGradient(addr: string) {
  // deterministic gradient from the address bytes
  const h1 = parseInt(addr.slice(2, 6), 16) % 360;
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 55%), hsl(${h2} 70% 45%))`;
}

export function fromBlockDate(timestamp: bigint | number) {
  if (Number(timestamp) == 0) return null;
  const ms = Number(timestamp) * 1000;
  return new Date(ms);
}