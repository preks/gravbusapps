export const formatTenure = (tenureMonths: number): string => {
  if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) {
    return 'Less than 1 month'
  }

  const months = Math.floor(tenureMonths)
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`
  }

  return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
}
