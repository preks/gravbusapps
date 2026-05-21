import { Button, Chip } from '@newwork/nw-design-system'

interface SelectedCompany {
  id: string
  name: string
}

interface HrAnalyticsFilterSummaryProps {
  selectedCompanies: SelectedCompany[]
  filtersLabel: string
  companyLabel: string
  clearAllLabel: string
  onRemoveCompany: (companyId: string) => void
  onClearAll: () => void
}

export function HrAnalyticsFilterSummary({
  selectedCompanies,
  filtersLabel,
  companyLabel,
  clearAllLabel,
  onClearAll
}: Readonly<HrAnalyticsFilterSummaryProps>) {
  if (selectedCompanies.length === 0) {
    return null
  }

  const selectedCompaniesLabel = selectedCompanies.map(c => c.name).join(', ')

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap gba:py-2 gba:px-2 gba:border-t gba:border-border">
      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{filtersLabel}</span>
      <Chip
        leftLabel={companyLabel}
        rightLabel={selectedCompaniesLabel}
        removable
        onRemove={onClearAll}
        title={`${companyLabel} | ${selectedCompaniesLabel}`}
      />
      <Button variant="ghost" size="sm" onClick={onClearAll} className="gba:h-8">
        {clearAllLabel}
      </Button>
    </div>
  )
}
