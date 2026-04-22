import React, { useEffect, useState, useMemo } from 'react'
import {
  Button,
  DateInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { PayrollRun } from '../../types/payrollTypes'

export interface CreatePayrollRunParams {
  month: number
  year: number
  cutOffDate: string
  paymentDate: string
}

interface CreatePayrollRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingRuns: PayrollRun[]
  saving: boolean
  onSubmit: (params: CreatePayrollRunParams) => Promise<void>
  t: (key: string) => string
}

const MONTH_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 2; y <= current + 2; y++) years.push(y)
  return years
}

function lastDayOfMonth(month: number, year: number): string {
  const d = new Date(Date.UTC(year, month, 0))
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function defaultCutOffDate(month: number, year: number): string {
  return lastDayOfMonth(month, year)
}

function defaultPaymentDate(cutOff: string): string {
  return addDays(cutOff, 10)
}

function isDateAfter(firstDate: string, secondDate: string): boolean {
  if (!firstDate || !secondDate) {
    return false
  }

  return firstDate > secondDate
}

function buildInitialFormState() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const cutOffDate = defaultCutOffDate(month, year)
  const paymentDate = defaultPaymentDate(cutOffDate)

  return { month, year, cutOffDate, paymentDate }
}

export const CreatePayrollRunDialog: React.FC<CreatePayrollRunDialogProps> = ({
  open,
  onOpenChange,
  existingRuns,
  saving,
  onSubmit,
  t
}) => {
  const [month, setMonth] = useState(() => buildInitialFormState().month)
  const [year, setYear] = useState(() => buildInitialFormState().year)
  const [cutOffDate, setCutOffDate] = useState(() => buildInitialFormState().cutOffDate)
  const [paymentDate, setPaymentDate] = useState(() => buildInitialFormState().paymentDate)

  const resetForm = () => {
    const initial = buildInitialFormState()
    setMonth(initial.month)
    setYear(initial.year)
    setCutOffDate(initial.cutOffDate)
    setPaymentDate(initial.paymentDate)
  }

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  const handleMonthChange = (val: string) => {
    const m = Number(val)
    setMonth(m)
    const cutOff = defaultCutOffDate(m, year)
    setCutOffDate(cutOff)
    setPaymentDate(defaultPaymentDate(cutOff))
  }

  const handleYearChange = (val: string) => {
    const y = Number(val)
    setYear(y)
    const cutOff = defaultCutOffDate(month, y)
    setCutOffDate(cutOff)
    setPaymentDate(defaultPaymentDate(cutOff))
  }

  const isDuplicate = useMemo(
    () => existingRuns.some(r => r.month === month && r.year === year),
    [existingRuns, month, year]
  )

  const hasRequiredDates = Boolean(cutOffDate) && Boolean(paymentDate)
  const isPaymentDateValid = isDateAfter(paymentDate, cutOffDate)
  const isValid = hasRequiredDates && isPaymentDateValid && !isDuplicate

  const handleSubmit = async () => {
    if (!isValid) return
    onOpenChange(false)
    await onSubmit({ month, year, cutOffDate, paymentDate })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" onInteractOutside={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('create-run-title')}</DialogTitle>
          <DialogDescription>{t('create-run-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('create-run-month')}
              </label>
              <Select value={String(month)} onValueChange={handleMonthChange}>
                <SelectTrigger data-testid="payroll-prep-create-run-month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_VALUES.map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {t(`month-${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('create-run-year')}
              </label>
              <Select value={String(year)} onValueChange={handleYearChange}>
                <SelectTrigger data-testid="payroll-prep-create-run-year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(y => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
              {t('create-run-cutoff')}
            </label>
            <DateInput
              type="date"
              value={cutOffDate}
              onChange={val => setCutOffDate(typeof val === 'string' ? val : '')}
              data-testid="payroll-prep-create-run-cutoff-input"
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
              {t('create-run-payment')}
            </label>
            <DateInput
              type="date"
              value={paymentDate}
              onChange={val => setPaymentDate(typeof val === 'string' ? val : '')}
              data-testid="payroll-prep-create-run-payment-input"
            />
          </div>

          {isDuplicate ? <p className="gba:text-sm gba:text-destructive">{t('create-run-duplicate-error')}</p> : null}
          {hasRequiredDates && !isPaymentDateValid ? (
            <p className="gba:text-sm gba:text-destructive">{t('create-run-payment-date-error')}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="payroll-prep-create-run-cancel-button"
          >
            {t('create-run-cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            data-testid="payroll-prep-create-run-submit-button"
          >
            {t('create-run-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
