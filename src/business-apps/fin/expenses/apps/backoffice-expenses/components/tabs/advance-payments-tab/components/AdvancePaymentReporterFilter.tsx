import type { TranslateFn } from '../../../../utils/utils'
import type { ReporterFilterRenderProps } from './AdvancePaymentFilterSheet'

export interface AdvancePaymentReporterFilterProps extends ReporterFilterRenderProps {
  reporterSearchText: string
  setReporterSearchText: (value: string) => void
  showReporterDropdown: boolean
  setShowReporterDropdown: (value: boolean) => void
  reporterSearchResults: string[]
  reporterSearchLoading: boolean
  t: TranslateFn
}

export function AdvancePaymentReporterFilter({
  selectedReporterIds,
  onSelectedReporterIdsChange,
  reporterSearchText,
  setReporterSearchText,
  showReporterDropdown,
  setShowReporterDropdown,
  reporterSearchResults,
  reporterSearchLoading,
  t
}: Readonly<AdvancePaymentReporterFilterProps>) {
  const handleReporterClick = (reporter: string) => {
    const newSelected = selectedReporterIds.includes(reporter)
      ? selectedReporterIds.filter(value => value !== reporter)
      : [...selectedReporterIds, reporter]
    onSelectedReporterIdsChange(newSelected)
  }

  return (
    <div className="reporter-search-container gba:relative gba:p-2">
      <input
        type="text"
        value={reporterSearchText}
        onChange={event => {
          setReporterSearchText(event.target.value)
          setShowReporterDropdown(true)
        }}
        onFocus={() => setShowReporterDropdown(true)}
        className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
        placeholder={t('filter-search-employee')}
        data-testid="reporter-search-input"
      />
      {showReporterDropdown && reporterSearchText.trim() !== '' ? (
        <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-background gba:border gba:border-input gba:rounded gba:max-h-40 gba:overflow-y-auto gba:z-10">
          {reporterSearchLoading ? (
            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">
              {t('advance-payment-loading-reporters')}
            </div>
          ) : reporterSearchResults.length === 0 ? (
            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{t('advance-payment-no-reporters')}</div>
          ) : (
            reporterSearchResults.map(reporter => (
              <button
                key={reporter}
                className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-muted gba:transition-colors ${
                  selectedReporterIds.includes(reporter)
                    ? 'gba:bg-accent gba:text-accent-foreground'
                    : 'gba:text-foreground'
                }`}
                onClick={() => handleReporterClick(reporter)}
                data-testid={`reporter-option-${reporter}`}
              >
                {reporter}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
