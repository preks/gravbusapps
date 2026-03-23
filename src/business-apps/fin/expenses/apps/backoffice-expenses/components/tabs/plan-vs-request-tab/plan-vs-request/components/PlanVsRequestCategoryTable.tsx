import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../../../_i18n'

interface CategoryData {
  id: string
  name: string
  code: string
  currentPeriodAmount: number
  previousPeriodAmount: number
  variance: number
}

interface PlanVsRequestCategoryTableProps {
  categories: CategoryData[]
  breakdownTotals: {
    prev: number
    curr: number
  }
  formatCurrency: (amount: number) => string
}

export const PlanVsRequestCategoryTable: React.FC<PlanVsRequestCategoryTableProps> = ({
  categories,
  breakdownTotals,
  formatCurrency
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid="details-list">
      <CardHeader>
        <CardTitle>{t('pvr-category-breakdown')}</CardTitle>
        <div className="gba:text-sm gba:text-muted-foreground gba:mt-2" data-testid="category-totals">
          {t('pvr-previous-total')}: {formatCurrency(breakdownTotals.prev)} {' | '}
          {t('pvr-current-total')}: {formatCurrency(breakdownTotals.curr)} {' | '}
          Δ%:{' '}
          {breakdownTotals.prev > 0
            ? Math.abs(((breakdownTotals.curr - breakdownTotals.prev) / breakdownTotals.prev) * 100).toFixed(1)
            : '0.0'}
          %
        </div>
      </CardHeader>
      <CardContent>
        <Table data-testid="category-breakdown-table">
          <TableHeader data-testid="category-breakdown-header">
            <TableRow>
              <TableHead>{t('pvr-category')}</TableHead>
              <TableHead className="gba:text-right">{t('pvr-previous')}</TableHead>
              <TableHead className="gba:text-right">{t('pvr-current')}</TableHead>
              <TableHead className="gba:text-right">{t('pvr-variance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="category-breakdown-body">
            {!categories || categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="gba:py-4 gba:text-center gba:text-muted-foreground"
                  data-testid="category-breakdown-empty-state"
                >
                  {t('pvr-no-category-data')}
                </TableCell>
              </TableRow>
            ) : (
              (categories || []).map(cat => (
                <TableRow key={cat.id} data-testid={`details-category-row-${cat.id}`}>
                  <TableCell data-testid={`category-name-cell-${cat.id}`}>
                    <div>
                      <div className="gba:font-medium">{cat.name}</div>
                      <div className="gba:text-sm gba:text-muted-foreground">{cat.code}</div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="gba:text-right gba:font-medium"
                    data-testid={`category-previous-cell-${cat.id}`}
                  >
                    {formatCurrency(cat.previousPeriodAmount)}
                  </TableCell>
                  <TableCell className="gba:text-right gba:font-medium" data-testid={`category-current-cell-${cat.id}`}>
                    {formatCurrency(cat.currentPeriodAmount)}
                  </TableCell>
                  <TableCell className="gba:text-right" data-testid={`category-variance-cell-${cat.id}`}>
                    {cat.previousPeriodAmount === 0 && cat.currentPeriodAmount > 0 ? (
                      <Badge variant="info" className="gba:font-medium">
                        {t('pvr-new-spend')}
                      </Badge>
                    ) : (
                      <Badge variant={cat.variance >= 0 ? 'destructive' : 'success'} className="gba:font-medium">
                        {`${cat.variance >= 0 ? '+' : ''}${cat.variance}%`}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
