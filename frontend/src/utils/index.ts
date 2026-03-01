/**
 * Format a date string for display (Arabic locale).
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('fr-DZ')
}

/**
 * Truncate text to a maximum length, appending '…' if exceeded.
 */
export function truncate(text: string, maxLen = 50): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

/**
 * Delay execution (useful for debouncing in async contexts).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Safely parse JSON; returns null on failure.
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}
