interface KpiShareProgress {
  percentage: number
  roundedPercentage: number
  progressTarget: number
}

const toNonNegativeFiniteNumber = (value: number): number => {
  if (Number.isFinite(value)) {
    return Math.max(0, value)
  }

  return 0
}

export const calculateKpiShareProgress = (count: number, total: number): KpiShareProgress => {
  const safeCount = toNonNegativeFiniteNumber(count)
  const safeTotal = toNonNegativeFiniteNumber(total)
  const percentage = safeTotal > 0 ? (safeCount / safeTotal) * 100 : 0

  return {
    percentage,
    roundedPercentage: Math.round(percentage),
    progressTarget: Math.max(safeTotal, 1)
  }
}
