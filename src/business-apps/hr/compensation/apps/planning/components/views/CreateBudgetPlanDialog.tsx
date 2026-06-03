import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  DateInput,
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
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { DEFAULT_BUDGET_PLAN_STATUS_APPROVED } from '../../../../types/budgetPlanGraphqlEnums'
import type {
  CompensationBudgetPlanRow,
  InsertBudgetPlanInput,
  UpdateBudgetPlanInput
} from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'
import { buildCreateBudgetPlanFormSchema, type CreateBudgetPlanFormValues } from './createBudgetPlanFormSchema'

function emptyDateToNull(s: string | undefined): string | null {
  if (s == null || s.trim() === '') {
    return null
  }
  return s.trim()
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const s = String(iso).trim()
  return s.length >= 10 ? s.slice(0, 10) : s
}

export interface CreateBudgetPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creating: boolean
  /** Used to block a new plan whose date range overlaps an existing plan (inclusive). */
  existingPlans: CompensationBudgetPlanRow[]
  onCreate: (input: InsertBudgetPlanInput) => Promise<string | null>
  /** When set, dialog edits this plan and submit calls `onUpdatePlan`. */
  editingPlan?: CompensationBudgetPlanRow | null
  onUpdatePlan?: (input: UpdateBudgetPlanInput) => Promise<boolean | null>
}

export const CreateBudgetPlanDialog: React.FC<CreateBudgetPlanDialogProps> = ({
  open,
  onOpenChange,
  creating,
  existingPlans,
  onCreate,
  editingPlan = null,
  onUpdatePlan
}) => {
  const { t } = useTranslation(translations)
  const isEdit = editingPlan != null

  const planRangesForSchema = useMemo(
    () => existingPlans.map(p => ({ id: p.id, startDate: p.startDate, endDate: p.endDate })),
    [existingPlans]
  )

  const resolver = useMemo(
    () =>
      zodResolver(
        buildCreateBudgetPlanFormSchema((key: string) => t(key), {
          existingPlans: planRangesForSchema,
          excludePlanId: isEdit ? editingPlan.id : undefined
        })
      ),
    [t, planRangesForSchema, isEdit, editingPlan]
  )

  const form = useForm<CreateBudgetPlanFormValues>({
    resolver,
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      effectiveDate: ''
    }
  })

  useEffect(() => {
    if (!open) return
    if (editingPlan != null) {
      form.reset({
        name: editingPlan.name,
        description: editingPlan.description ?? '',
        startDate: isoToDateInput(editingPlan.startDate),
        endDate: isoToDateInput(editingPlan.endDate),
        effectiveDate: isoToDateInput(editingPlan.effectiveDate)
      })
      return
    }
    form.reset({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      effectiveDate: ''
    })
  }, [open, editingPlan, form])

  const onSubmit = form.handleSubmit(async values => {
    if (isEdit && editingPlan != null && onUpdatePlan) {
      const input: UpdateBudgetPlanInput = {
        id: editingPlan.id,
        version: editingPlan.version,
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        startDate: emptyDateToNull(values.startDate),
        endDate: emptyDateToNull(values.endDate),
        effectiveDate: emptyDateToNull(values.effectiveDate)
      }
      const ok = await onUpdatePlan(input)
      if (ok) {
        onOpenChange(false)
      }
      return
    }

    const input: InsertBudgetPlanInput = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      budgetPlanStatus: DEFAULT_BUDGET_PLAN_STATUS_APPROVED,
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
          <DialogTitle>
            {isEdit ? t('budget-plan-update-dialog-title') : t('budget-plan-create-dialog-title')}
          </DialogTitle>
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
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget-plan-form-start-date')}</FormLabel>
                  <FormControl>
                    <div data-testid="budget-plan-form-start-date-input">
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={(v?: string) => field.onChange(v || '')}
                        placeholder={t('budget-plan-form-date-placeholder')}
                        className="gba:w-full"
                        locale={getCurrentActiveUserLocale()}
                        captionLayout="dropdown"
                      />
                    </div>
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
                    <div data-testid="budget-plan-form-end-date-input">
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={(v?: string) => field.onChange(v || '')}
                        placeholder={t('budget-plan-form-date-placeholder')}
                        className="gba:w-full"
                        locale={getCurrentActiveUserLocale()}
                        captionLayout="dropdown"
                      />
                    </div>
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
                    <div data-testid="budget-plan-form-effective-date-input">
                      <DateInput
                        type="date"
                        value={field.value || ''}
                        onChange={(v?: string) => field.onChange(v || '')}
                        placeholder={t('budget-plan-form-date-placeholder')}
                        className="gba:w-full"
                        locale={getCurrentActiveUserLocale()}
                        captionLayout="dropdown"
                      />
                    </div>
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
                {isEdit ? t('budget-plan-update-submit') : t('budget-plan-create-submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
