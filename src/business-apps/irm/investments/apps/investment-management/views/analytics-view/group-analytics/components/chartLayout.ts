export const CATEGORY_CHART_MARGIN = {
  top: 16,
  right: 24,
  left: 8,
  bottom: 32
}

export const CATEGORY_AXIS_PROPS = {
  angle: -30,
  textAnchor: 'end' as const,
  interval: 0,
  height: 56,
  tick: { fontSize: 12 }
}

export const getShortCategoryLabel = (value: string): string => {
  return value.length > 12 ? `${value.slice(0, 10)}...` : value
}
