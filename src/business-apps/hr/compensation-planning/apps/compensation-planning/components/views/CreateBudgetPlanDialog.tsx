import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  Textarea,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { DEFAULT_BUDGET_PLAN_STATUS_DRAFT, BUDGET_PLAN_STATUS_OPTIONS } from '../../../../types/budgetPlanGraphqlEnums'
import type { InsertBudgetPlanInput } from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import { buildCreateBudgetPlanFormSchema, type CreateBudgetPlanFormValues } from './createBudgetPlanFormSchema'

function emptyDateToNull(s: string | undefined): string | null {
  if (s == null || s.trim() === '') {
    return null
  }
  return s.trim()
}

export interface CreateBudgetPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creating: boolean
  onCreate: (input: InsertBudgetPlanInput) => Promise<string | null>
}

export const CreateBudgetPlanDialog: React.FC<CreateBudgetPlanDialogProps> = ({
  open,
  onOpenChange,
  creating,
  onCreate
}) => {
  const { t } = useTranslation(translations)
  const schema = React.useMemo(() => buildCreateBudgetPlanFormSchema((key: string) => t(key)), [t])

  const form = useForm<CreateBudgetPlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      fiscalYear: new Date().getFullYear(),
      budgetPlanStatus: DEFAULT_BUDGET_PLAN_STATUS_DRAFT,
      startDate: '',
      endDate: '',
      effectiveDate: ''
    }
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: '',
      description: '',
      fiscalYear: new Date().getFullYear(),
      budgetPlanStatus: DEFAULT_BUDGET_PLAN_STATUS_DRAFT,
      startDate: '',
      endDate: '',
      effectiveDate: ''
    })
  }, [open, form])

  const onSubmit = form.handleSubmit(async values => {
    const input: InsertBudgetPlanInput = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      fiscalYear: values.fiscalYear,
      budgetPlanStatus: values.budgetPlanStatus,
      startDate: emptyDateToNull(values.startDate),
      endDate: emptyDateToNull(values.endDate),
      effectiveDate: emptyDateToNull(values.effectiveDate)
    }
    const id = await onCreate(input)
    if (id) {
      onOpenChange(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-lg gba:max-h-[90vh] gba:overflow-y-auto"
        data-testid="budget-plan-create-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('budget-plan-create-dialog-title')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="gba:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-name')}</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" data-testid="budget-plan-form-name-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} autoComplete="off" rows={4} data-testid="budget-plan-form-description-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0">
                    <FormLabel>{t('budget-plan-form-fiscal-year')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1900}
                        max={2200}
                        className="gba:w-full"
                        data-testid="budget-plan-form-fiscal-year-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetPlanStatus"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0">
                    <FormLabel>{t('budget-plan-form-status')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="gba:w-full" data-testid="budget-plan-form-status-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUDGET_PLAN_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>
                            {formatBudgetPlanStatusLabelForDisplay(s, t) || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-start-date')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="budget-plan-form-start-date-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-end-date')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="budget-plan-form-end-date-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-effective-date')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="budget-plan-form-effective-date-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gba:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="budget-plan-create-cancel"
              >
                {t('budget-plan-create-cancel')}
              </Button>
              <Button type="submit" disabled={creating} data-testid="budget-plan-create-submit">
                {t('budget-plan-create-submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
