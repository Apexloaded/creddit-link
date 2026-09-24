export { cn } from "cn"

/**
 * Truncates any input value into a formatted string.
 * Supports standard text truncation and wallet address middle-truncation.
 */
export function truncate(value: unknown, options: {
  /** Total maximum length of the output string (including ellipsis). Default: 30 */
  length?: number;
  /** Custom ellipsis string. Default: '...' */
  ellipsis?: string;
  /** Number of characters to keep at the start (specifically for wallet/hash style truncation) */
  prefixKeep?: number;
  /** Number of characters to keep at the end (specifically for wallet/hash style truncation) */
  suffixKeep?: number;
} = {}): string {
  const {
    length = 30,
    ellipsis = '...',
    prefixKeep,
    suffixKeep,
  } = options;

  // Handle null or undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert objects/arrays to JSON strings, otherwise cast to String
  let str: string;
  if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Middle-truncation for wallet addresses / hashes when prefixKeep and suffixKeep are supplied
  if (typeof prefixKeep === 'number' && typeof suffixKeep === 'number') {
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
 * Converts a string to a hex color string
 */
export function stringToColor(str?: string) {
  if (!str) {
    return "#000000";
  }
  // Hash function to convert string to a number (modify if needed)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a hex color string (adjust for desired color range)
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, "0");
  }

  return color;
};