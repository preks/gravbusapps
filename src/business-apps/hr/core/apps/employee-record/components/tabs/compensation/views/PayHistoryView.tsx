'use client'

import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { CompensationHistoryData } from '../types/compensationTypes'
import { getCompensationStatusLabel, getCompensationStatusVariant } from '../types/compensationEnums'
import PayslipHistorySection from '../components/history/PayslipHistorySection'
import dayjs from 'dayjs'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslatedCatalogEntryValue } from '../utils/benefitTranslationUtils'

interface PayHistoryViewProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string
  historyData?: CompensationHistoryData | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
  locale: string
}

/**
 * Compensation History View Component
 * Displays historical compensation changes, payslips, and bonus payments
 */
const PayHistoryView: React.FC<PayHistoryViewProps> = ({
  t,
  historyData,
  loading,
  error,
  onRetry,
  locale,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Handle loading state - show loading indicators when data is not yet available
  if (loading && !historyData) {
    return (
      <div className="gba:space-y-6" data-testid="compensation-history-view-loading">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('loading-compensation-history')}</div>
        </div>
      </div>
    )
  }

  // Handle error state with retry option
  if (error) {
    return (
      <div className="gba:space-y-6" data-testid="compensation-history-view-error">
        <Card>
          <CardContent className="gba:p-8">
            <div className="gba:text-center gba:space-y-4">
              <div className="gba:text-destructive gba:text-lg gba:font-semibold">{t('compensation-error-title')}</div>
              <div className="gba:text-muted-foreground">{error}</div>
              {onRetry && (
                <div className="gba:mt-4">
                  <Button variant="default" onClick={onRetry} data-testid="compensation-history-retry-button">
                    {t('compensation-error-retry')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle empty state (no error, but no data either)
  if (!historyData) {
    return (
      <div className="gba:space-y-6" data-testid="compensation-history-view-empty">
        <div className="gba:text-center gba:text-muted-foreground gba:py-12">
          <div className="gba:text-lg">{t('empty-compensation-history')}</div>
          <div className="gba:text-sm gba:mt-2">No compensation history records have been created yet.</div>
        </div>
      </div>
    )
  }

  const { compensationHistory, bonusHistory, payslipHistory } = historyData

  /**
   * Render compensation history content based on loading state and data availability
   */
  const renderCompensationHistoryContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-loading-compensation')}</div>
      )
    }

    // Empty state
    if (compensationHistory.length === 0) {
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-no-compensation')}</div>
    }

    // Content - display compensation history table
    return (
      <Table data-testid="salary-history-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t('table-effective-date')}</TableHead>
            <TableHead>{t('table-base-salary')}</TableHead>
            <TableHead>{t('table-monthly-salary')}</TableHead>
            <TableHead>{t('table-compensation-band')}</TableHead>
            <TableHead>{t('table-pay-grade')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compensationHistory.map(record => {
            // Validate and format effective date
            let effectiveDate: string | null = null
            if (record.effectiveDate) {
              const effectiveDateObj = dayjs(record.effectiveDate)
              if (effectiveDateObj.isValid()) {
                effectiveDate = effectiveDateObj.locale(locale).format('MMM D, YYYY')
              }
            }

            // Validate and format end date
            let endDate: string | null = null
            if (record.endDate) {
              const endDateObj = dayjs(record.endDate)
              if (endDateObj.isValid()) {
                endDate = endDateObj.locale(locale).format('MMM D, YYYY')
              }
            }

            return (
              <TableRow key={record.id} data-testid={`salary-history-row-${record.id}`}>
                <TableCell>
                  {effectiveDate ? (
                    <>
                      <div className="gba:font-medium">{effectiveDate}</div>
                      {endDate && <div className="gba:text-xs gba:text-muted-foreground">to {endDate}</div>}
                    </>
                  ) : (
                    <div className="gba:text-muted-foreground gba:italic">Date not available</div>
                  )}
                </TableCell>
                <TableCell>
                  {record.currency && record.baseSalary != null ? (
                    <>
                      <div className="gba:font-semibold gba:text-foreground">
                        {formatCurrencyString(record.baseSalary, {
                          currency: record.currency.code,
                          locale: locale,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">{t('current-annually')}</div>
                    </>
                  ) : (
                    <div className="gba:text-muted-foreground gba:italic">
                      {t('no-salary-record', 'No salary record')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {record.monthlyGrossSalary ? (
                    <>
                      {record.currency ? (
                        <>
                          <div className="gba:font-semibold gba:text-foreground">
                            {formatCurrencyString(record.monthlyGrossSalary, {
                              currency: record.currency.code,
                              locale: locale,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground">{t('current-monthly')}</div>
                        </>
                      ) : (
                        <div className="gba:text-muted-foreground">-</div>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{record.compensationBand ? record.compensationBand.name : '-'}</TableCell>
                <TableCell>
                  {record.compensationBand ? (
                    <Badge variant="outline">Level {record.compensationBand.payGrade}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  /**
   * Render bonus history content based on loading state and data availability
   */
  const renderBonusHistoryContent = () => {
    // Loading state
    if (loading) {
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-loading-bonus')}</div>
    }

    // Empty state
    if (bonusHistory.length === 0) {
      return <div className="gba:text-center gba:text-muted-foreground gba:py-8">{t('history-no-bonus')}</div>
    }

    // Content - display bonus history table
    return (
      <Table data-testid="bonus-history-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t('table-date')}</TableHead>
            <TableHead>{t('table-amount')}</TableHead>
            <TableHead>{t('table-type')}</TableHead>
            <TableHead>{t('table-fiscal-year')}</TableHead>
            <TableHead>{t('table-status')}</TableHead>
            <TableHead>{t('table-notes')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bonusHistory.map(bonus => (
            <TableRow key={bonus.id} data-testid={`bonus-history-row-${bonus.id}`}>
              <TableCell>{dayjs(bonus.paymentDate).locale(locale).format('MMM D, YYYY')}</TableCell>
              <TableCell>
                <div className="gba:font-semibold gba:text-success">
                  {formatCurrencyString(bonus.amount, {
                    currency: bonus.currency.code,
                    locale: locale,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </div>
              </TableCell>
              <TableCell>{getTranslatedCatalogEntryValue(bonus.bonusType, locale)}</TableCell>
              <TableCell>{bonus.fiscalYear}</TableCell>
              <TableCell>
                <Badge variant={getCompensationStatusVariant(bonus.status)}>
                  {getCompensationStatusLabel(bonus.status, t)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="gba:text-sm gba:text-muted-foreground">{bonus.notes || '-'}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="compensation-history-view">
      {/* Compensation History Section */}
      <Card data-testid="compensation-history-section">
        <CardHeader>
          <CardTitle>{t('history-compensation-title')}</CardTitle>
        </CardHeader>
        <CardContent>{renderCompensationHistoryContent()}</CardContent>
      </Card>

      {/* Payslip History Section */}
      <PayslipHistorySection
        t={t}
        payslips={payslipHistory}
        loading={loading}
        locale={locale}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />

      {/* Bonus History Section */}
      <Card data-testid="bonus-history-section">
        <CardHeader>
          <CardTitle>{t('history-bonus-title')}</CardTitle>
        </CardHeader>
        <CardContent>{renderBonusHistoryContent()}</CardContent>
      </Card>
    </div>
  )
}

export default PayHistoryView
