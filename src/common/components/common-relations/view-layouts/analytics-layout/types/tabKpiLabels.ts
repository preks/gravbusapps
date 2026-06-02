export interface TabKpiLabel {
  title: string
  description: string
}

export type PartialTabKpiLabels<T extends Record<string, TabKpiLabel>> = {
  [K in keyof T]?: Partial<TabKpiLabel>
}

export function mergeTabKpiLabels<T extends Record<string, TabKpiLabel>>(
  defaults: T,
  overrides: PartialTabKpiLabels<T> = {}
): T {
  const keys = Object.keys(defaults) as Array<keyof T>
  return keys.reduce(
    (merged, key) => ({
      ...merged,
      [key]: { ...defaults[key], ...overrides[key] }
    }),
    {} as T
  )
}
