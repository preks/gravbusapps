export const PILL_TYPE_COLOR_MAP = {
  draft: '#797d82',
  completed: '#0DBC7B',
  waiting: '#0094D1',
  task: '#FF9E02',
  error: '#DE1D49',
  preparing: '#94A9C7',
} as const;

export type PillTypeKey = keyof typeof PILL_TYPE_COLOR_MAP;

export const getPillColor = (
  type?: string,
  fallback: string = 'var(--nw-color-neutral-300)'
): string => {
  if (!type) return fallback;
  return type in PILL_TYPE_COLOR_MAP
    ? PILL_TYPE_COLOR_MAP[type as PillTypeKey]
    : fallback;
};


