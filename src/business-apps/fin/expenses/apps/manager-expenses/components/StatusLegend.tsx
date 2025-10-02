import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PillType } from '@/components/pill/Pill';

// Design token utility class map for legend color dots
// Using Tailwind utility classes with design system tokens instead of inline styles
const pillTypeClassMap: Record<PillType, string> = {
  draft: 'gba:bg-muted',           // gray (draft status)
  completed: 'gba:bg-success',     // green (completed status)
  waiting: 'gba:bg-info',          // blue (waiting/pending status)
  task: 'gba:bg-warning',          // amber/orange (task status)
  error: 'gba:bg-destructive',     // red (error/rejected status)
  preparing: 'gba:bg-muted'        // gray (preparing status)
};

// Design token CSS variables for charts (will be resolved to hex at runtime)
// Recharts requires actual color values, so we use CSS variables that get resolved
const pillTypeColorTokens: Record<PillType, string> = {
  draft: 'var(--nw-color-neutral-500)',
  completed: 'var(--nw-color-success-500)',
  waiting: 'var(--nw-color-info-500)',
  task: 'var(--nw-color-warning-500)',
  error: 'var(--nw-color-destructive-500)',
  preparing: 'var(--nw-color-neutral-500)'
};

// Helper function to resolve CSS variables to hex colors (SSR-safe)
// This is needed because Recharts requires actual hex/rgb values, not CSS variables
const resolveCssVar = (color: string): string => {
  if (!color?.startsWith('var(')) return color;
  if (
    typeof globalThis.window === 'undefined' ||
    typeof globalThis.document === 'undefined' ||
    typeof globalThis.window.getComputedStyle !== 'function'
  ) {
    // SSR fallback: return hex values directly
    const fallbackMap: Record<string, string> = {
      'var(--nw-color-neutral-500)': '#9ca3af',
      'var(--nw-color-success-500)': '#10b981',
      'var(--nw-color-info-500)': '#3b82f6',
      'var(--nw-color-warning-500)': '#f59e0b',
      'var(--nw-color-destructive-500)': '#ef4444',
    };
    return fallbackMap[color] || color;
  }
  const varName = color.substring(4, color.length - 1).trim();
  const value = globalThis.window.getComputedStyle(globalThis.document.documentElement).getPropertyValue(varName).trim();
  return value || color;
};

// Resolved color map for charts (hex values resolved from CSS variables)
const pillTypeColorMap: Record<PillType, string> = Object.entries(pillTypeColorTokens).reduce(
  (acc, [key, token]) => {
    acc[key as PillType] = resolveCssVar(token);
    return acc;
  },
  {} as Record<PillType, string>
);

// Fallback labels for SSR (when window is not available)
const pillTypeFallbackLabels: Record<PillType, string> = {
  draft: 'Draft',
  completed: 'Completed',
  waiting: 'Waiting',
  task: 'Task',
  error: 'Error',
  preparing: 'Preparing',
};

// Helper function to get label with SSR safety
const getPillTypeLabel = (type: PillType): string => {
  // Only call translation function in browser environment
  if (typeof globalThis.window !== 'undefined') {
    switch (type) {
      case 'draft':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.draft', 'Draft');
      case 'completed':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.completed', 'Completed');
      case 'waiting':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.waiting', 'Waiting');
      case 'task':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.task', 'Task');
      case 'error':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.error', 'Error');
      case 'preparing':
        return getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.preparing', 'Preparing');
      default:
        return pillTypeFallbackLabels[type];
    }
  }
  // Fallback to static labels during SSR
  return pillTypeFallbackLabels[type];
};

export const StatusLegend: React.FC<{ id?: string }> = ({ id }) => (
  <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-3" data-testid={id ? `${id}-status-legend` : 'status-legend'}>
    {(Object.keys(pillTypeClassMap) as PillType[]).map((type) => (
      <div key={type} className="gba:flex gba:items-center gba:gap-2">
        <span
          aria-hidden="true"
          className={`gba:inline-block gba:h-3 gba:w-3 gba:rounded-full ${pillTypeClassMap[type]}`}
        />
        <span className="gba:text-xs gba:text-muted-foreground">{getPillTypeLabel(type)}</span>
      </div>
    ))}
  </div>
);

// Expose color map globally for charts that need hex values
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__nw_pill_colors = pillTypeColorMap;
}

export default StatusLegend;


