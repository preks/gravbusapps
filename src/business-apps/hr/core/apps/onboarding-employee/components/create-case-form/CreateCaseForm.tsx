import React, { useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useCases } from '../../hooks/useCases'
import { APP_TAGS } from '../../constants'
import onboardingI18n from '../../_i18n'

const TITLE_MAX = 64
const DESCRIPTION_MAX = 100

const createCaseFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z
      .string()
      .min(1, t('create-case-validation-title-required'))
      .max(TITLE_MAX, t('create-case-validation-title-max')),
    description: z
      .string()
      .max(DESCRIPTION_MAX, t('create-case-validation-description-max'))
      .optional()
      .or(z.literal('')),
    dueDate: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        val => {
          if (!val || val.trim() === '') return true
          const d = new Date(val)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          d.setHours(0, 0, 0, 0)
          return d >= today
        },
        { message: t('create-case-validation-due-date-future') }
      )
  })

export type CreateCaseFormValues = z.infer<ReturnType<typeof createCaseFormSchema>>

export interface CreateCaseFormProps {
  /** Button that opens the modal (e.g. "+ Create case"). Passed to FormWrapperModal as childAddButton. */
  childAddButton?: React.ReactNode
  /** Optional controlled open state when opening modal from outside */
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  onSuccess?: () => void
  accessToken: string
  /** Current user's employee id – sent as initiator. From context: userInfo?.employeeDetails?.employeeId */
  currentEmployeeId?: string
}

export const CreateCaseForm: React.FC<CreateCaseFormProps> = ({
  childAddButton,
  open,
  setOpen,
  onSuccess,
  accessToken,
  currentEmployeeId
}) => {
  const { t } = useTranslation(onboardingI18n)
  const [assignTo, setAssignTo] = useState<string | null>(null)

  const schema = useMemo(() => createCaseFormSchema(t), [t])
  const defaultValues = useMemo<CreateCaseFormValues>(() => ({ title: '', description: '', dueDate: '' }), [])

  const form = useForm<CreateCaseFormValues>({
    defaultValues,
    resolver: zodResolver(schema) as any,
    mode: 'onChange'
  })

  const { employees, search, hasMore, loadMore, loading: searchLoading } = useEmployeeSearch(accessToken)
  const { createCase } = useCases(accessToken)

  const handleSubmit = useCallback(
    async (data: CreateCaseFormValues) => {
      await createCase({
        initiator: currentEmployeeId || 'system',
        tags: { ...APP_TAGS },
        title: data.title.trim(),
        assignment: assignTo != null && assignTo !== '' ? { assignmentMode: 'ASSIGN', assignTo } : undefined
      })
      onSuccess?.()
    },
    [createCase, currentEmployeeId, assignTo, onSuccess]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={t('create-case-modal-title')}
      description={t('create-case-modal-description')}
      open={open}
      setOpen={setOpen}
      onSubmit={data => handleSubmit(data as CreateCaseFormValues)}
      onCancel={() => setAssignTo(null)}
      defaultValues={defaultValues}
      form={form as any}
      schema={schema}
      submitButtonText={t('onboarding-employee-create-case')}
      dataTestId="create-case-form"
      showCancelButton
      validateBeforeSubmit
      showErrorMessage
    >
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('create-case-label-title')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('create-case-placeholder-title')}
                {...field}
                maxLength={TITLE_MAX}
                data-testid="create-case-title-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('create-case-label-description')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('create-case-placeholder-description')}
                rows={3}
                {...field}
                maxLength={DESCRIPTION_MAX}
                data-testid="create-case-description-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="dueDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('create-case-label-due-date')}</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value || ''}
                min={new Date().toISOString().slice(0, 10)}
                data-testid="create-case-due-date-input"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="assignTo"
        render={() => (
          <FormItem>
            <FormLabel>{t('create-case-label-assign-to')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={assignTo}
                employees={employees}
                onValueChange={setAssignTo}
                onSearch={search}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder={t('create-case-placeholder-assign-to')}
                searchPlaceholder={t('create-case-placeholder-assign-to-search')}
                data-testid="create-case-assign-to"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}
