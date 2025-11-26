type BadgeVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'paid'
  | 'overdue'
  | 'offline'

export const getOpportunityStatusBadgeVariant = (statusCode: string): BadgeVariant => {
  switch (statusCode?.toUpperCase()) {
    case 'WON':
      return 'success'
    case 'LOST':
      return 'destructive'
    case 'OPEN':
    case 'IN_PROGRESS':
      return 'running'
    case 'PENDING':
      return 'pending'
    default:
      return 'default'
  }
}

export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
}
