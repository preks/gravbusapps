/**
 * AI Color Tokens for EveryAI
 * Dedicated orange color scheme for AI-related UI elements
 * Uses CSS custom properties that can be themed
 */

export const AI_COLORS = {
  // Main AI color (orange)
  ai: 'var(--nw-ai, #f59e0b)', // Orange - fallback to warning color
  aiForeground: 'var(--nw-ai-foreground, #ffffff)', // White text on AI backgrounds
  aiSecondary: 'var(--nw-ai-secondary, #fbbf24)', // Lighter orange for secondary elements
  aiSecondaryForeground: 'var(--nw-ai-secondary-foreground, #000000)' // Dark text on secondary AI backgrounds
} as const

/**
 * Tailwind class names for AI colors
 * Use these instead of warning colors for AI-specific elements
 * Now using proper Tailwind tokens: gba:from-ai, gba:bg-ai, etc.
 */
export const AI_COLOR_CLASSES = {
  bg: 'gba:bg-ai',
  bgSecondary: 'gba:bg-ai-secondary',
  text: 'gba:text-ai',
  textForeground: 'gba:text-ai-foreground',
  border: 'gba:border-ai',
  borderSecondary: 'gba:border-ai-secondary',
  // Gradient combinations
  gradientFrom: 'gba:from-ai',
  gradientTo: 'gba:to-ai-secondary',
  gradientFromSecondary: 'gba:from-ai-secondary',
  gradientToSecondary: 'gba:to-ai-secondary'
} as const
