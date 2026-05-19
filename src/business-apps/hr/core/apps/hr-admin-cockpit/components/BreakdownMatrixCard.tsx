import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import translations from '../_i18n'

const BREAKDOWN_MAX_VISIBLE_LOCATIONS = 6

function missingPercentColor(pct: number): string {
  if (pct === 0) return 'gba:bg-muted gba:text-muted-foreground'
  if (pct <= 25) return 'gba:bg-success/10 gba:text-success'
  if (pct <= 50) return 'gba:bg-warning/10 gba:text-warning'
  if (pct <= 75) return 'gba:bg-warning/20 gba:text-warning'
  return 'gba:bg-destructive/10 gba:text-destructive'
}

export function BreakdownMatrixCard() {
  const { t } = useTranslation(translations)
  const { breakdownMatrix, loading } = useDataQualityContext()

  if (loading) return <Spinner />

  const { companies, locations, cells, allLocationsColumn } = breakdownMatrix
  const translateFallbackLabel = (label: string) => (label.startsWith('unknown-') ? t(label) : label)

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:font-semibold">{t('section-breakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState type="no-data" compact title={t('empty-no-breakdown')} description={t('empty-no-employees')} />
        </CardContent>
      </Card>
    )
  }

  const visibleLocations = locations.slice(0, BREAKDOWN_MAX_VISIBLE_LOCATIONS)

  return (
    <Card className="gba:overflow-hidden">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">{t('section-breakdown')}</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('breakdown-subtitle')}</p>
      </CardHeader>
      <CardContent className="gba:overflow-x-auto gba:pb-3">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3 gba:flex-wrap">
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-success/10 gba:border gba:border-success/30" />{' '}
            {t('breakdown-legend-low')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-warning/10 gba:border gba:border-warning/30" />{' '}
            {t('breakdown-legend-medium')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-warning/20 gba:border gba:border-warning/40" />{' '}
            {t('breakdown-legend-high')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-destructive/10 gba:border gba:border-destructive/30" />{' '}
            {t('breakdown-legend-critical')}
          </span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
            <span className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-sm gba:bg-muted gba:border" />{' '}
            {t('breakdown-legend-none')}
          </span>
        </div>
        <Table className="gba:text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:whitespace-nowrap">{t('breakdown-col-legal-entity')}</TableHead>
              <TableHead className="gba:text-center gba:whitespace-nowrap">
                {t('breakdown-col-all-locations')}
              </TableHead>
              {visibleLocations.map(loc => (
                <TableHead
                  key={loc.id}
                  className="gba:text-center gba:whitespace-nowrap gba:max-w-20 gba:truncate"
                  title={translateFallbackLabel(loc.label)}
                >
                  {translateFallbackLabel(loc.label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(co => {
              const allLoc = allLocationsColumn.get(co.id)
              const companyLabel = translateFallbackLabel(co.label)
              return (
                <TableRow key={co.id}>
                  <TableCell
                    className="gba:font-medium gba:whitespace-nowrap gba:max-w-36 gba:truncate"
                    title={companyLabel}
                  >
                    {companyLabel}
                  </TableCell>
                  <TableCell className="gba:text-center">
                    {allLoc ? (
                      <span
                        className={`gba:inline-block gba:rounded gba:px-2 gba:py-0.5 gba:tabular-nums gba:font-medium ${missingPercentColor(allLoc.percent)}`}
                      >
                        {allLoc.percent}%
                      </span>
                    ) : (
                      <span className="gba:text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {visibleLocations.map(loc => {
                    const cell = cells.get(`${co.id}::${loc.id}`)
                    return (
                      <TableCell key={loc.id} className="gba:text-center">
                        {cell && cell.totalEmployees > 0 ? (
                          <span
                            className={`gba:inline-block gba:rounded gba:px-2 gba:py-0.5 gba:tabular-nums gba:font-medium ${missingPercentColor(cell.missingPercent)}`}
                          >
                            {cell.missingPercent}%
                          </span>
                        ) : (
                          <span className="gba:text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
