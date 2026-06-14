import React, { useMemo, useRef } from 'react'
import {
  PageLayout,
  Card,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Toaster,
  useTranslation
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { UploadSimpleIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/hooks/useBillingData'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { useReconciliation } from '../../common/hooks/useReconciliation'
import { suggestMatches, findExceptions } from '../../common/utils/reconciliation'
import { parseBankStatementCsv } from '../../common/utils/invoiceExport'
import { formatCurrency, formatPercent } from '../../common/utils/currency'
import { invoiceCustomerName } from '../../common/utils/customers'
import { formatDate } from '@/common/utils/windowUtils'

type ReconciliationProps = BusinessAppContextProps

const Reconciliation: React.FC<ReconciliationProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const permissions = useBillingPermissions(props)
  const recon = useReconciliation(props)
  const statementLines = recon.lines
  const fileInputRef = useRef<HTMLInputElement>(null)

  const localMatches = useMemo(
    () => suggestMatches(statementLines, billing.invoices),
    [statementLines, billing.invoices]
  )
  const matches = recon.suggestionsAvailable ? recon.matches : localMatches
  const exceptions = useMemo(() => findExceptions(statementLines, matches), [statementLines, matches])
  const invoiceById = useMemo(() => new Map(billing.invoices.map(invoice => [invoice.id, invoice])), [billing.invoices])

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseBankStatementCsv(text)
    try {
      await recon.importLines(
        parsed.map(line => ({
          amount: line.amount,
          currency: line.currency,
          bookingDate: line.bookingDate,
          counterparty: line.counterparty ?? null,
          reference: line.reference ?? null
        }))
      )
      toast.success(t('billing-reconciliation-import'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import statement')
    }
  }

  const handleApply = async (bankLineId: string, invoiceId: string, amount: number) => {
    try {
      await recon.applyMatch(bankLineId, invoiceId, amount)
      toast.success(t('billing-reconciliation-apply'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply match')
    }
  }

  return (
    <PageLayout
      headerIcon={ArrowsLeftRightIcon}
      headerTitle={t('billing-reconciliation-title')}
      headerDescription={t('billing-reconciliation-description')}
      variant="default"
    >
      {(billing.usingSampleData || recon.usingSampleData || billing.error || recon.error) && (
        <Alert className="gba:mb-4">
          <AlertDescription>
            {billing.usingSampleData || recon.usingSampleData
              ? t('billing-sample-data-notice')
              : t('billing-backend-error-notice')}
            {(billing.error || recon.error) && (
              <span className="gba:block gba:mt-1 gba:text-muted-foreground">
                {`${t('billing-connection-detail')}: ${billing.error ?? recon.error}`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="gba:flex gba:justify-end gba:mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="gba:hidden"
          onChange={handleFile}
          data-testid="reconciliation-file-input"
        />
        <Button variant="outline" size="sm" onClick={handleImportClick} data-testid="reconciliation-import-button">
          <UploadSimpleIcon size={16} className="gba:mr-1" />
          {t('billing-reconciliation-import')}
        </Button>
      </div>

      <Card className="gba:p-6 gba:mb-4" data-testid="reconciliation-suggested">
        <h2 className="gba:text-base gba:font-semibold gba:mb-3">{t('billing-reconciliation-suggested')}</h2>
        {matches.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('billing-reconciliation-no-exceptions')}</p>
        ) : (
          <ul className="gba:flex gba:flex-col gba:gap-2">
            {matches.map(match => {
              const invoice = invoiceById.get(match.invoiceId)
              const line = statementLines.find(item => item.id === match.bankStatementLineId)
              if (!invoice || !line) return null
              return (
                <li
                  key={match.bankStatementLineId}
                  className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:border-b gba:py-2 gba:text-sm gba:flex-wrap"
                >
                  <span>{formatDate(line.bookingDate, 'date.medium')}</span>
                  <span className="gba:font-medium">{invoice.invoiceNumber}</span>
                  <span>{invoiceCustomerName(invoice)}</span>
                  <span>{formatCurrency(match.matchedAmount, line.currency)}</span>
                  <Badge variant={match.confidence >= 0.8 ? 'success' : 'warning'}>
                    {t('billing-reconciliation-confidence')}: {formatPercent(match.confidence * 100)}
                  </Badge>
                  {permissions.canMarkPaid && !line.matchedInvoiceId && (
                    <Button
                      size="sm"
                      onClick={() => handleApply(line.id, invoice.id, match.matchedAmount)}
                      data-testid={`reconciliation-apply-${line.id}`}
                    >
                      {t('billing-reconciliation-apply')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="gba:p-6" data-testid="reconciliation-exceptions">
        <h2 className="gba:text-base gba:font-semibold gba:mb-3">{t('billing-reconciliation-exceptions')}</h2>
        {exceptions.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('billing-reconciliation-no-exceptions')}</p>
        ) : (
          <ul className="gba:flex gba:flex-col gba:gap-2">
            {exceptions.map(line => (
              <li
                key={line.id}
                className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2 gba:text-sm"
              >
                <span>{formatDate(line.bookingDate, 'date.medium')}</span>
                <span>{line.counterparty ?? '—'}</span>
                <span>{line.reference ?? '—'}</span>
                <span className="gba:font-medium">{formatCurrency(line.amount, line.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Toaster />
    </PageLayout>
  )
}

export default Reconciliation
