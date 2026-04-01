import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Checkbox,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Alert,
  AlertDescription,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import type { User, CreateUserPayload, UpdateUserPayload } from '@/common/network/users/types'
import { useGroupManagement } from '../../../../hooks/useGroupManagement'
import translations from '../../../../_i18n'
import {
  TEXT_FIELDS,
  baseUserFormSchema,
  createUserFormSchema,
  defaultCreateValues,
  defaultEditValues,
  type CreateFormValues,
  type EditFormValues,
  type UserDialogMode
} from './userDialogFormConfig'
import { UserDialogGroupSelect } from './UserDialogGroupSelect'

export interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: UserDialogMode
  accessToken: string
  userId: string | null
  getUserById: (userId: string) => Promise<User>
  createUser: (payload: CreateUserPayload) => Promise<User>
  updateUser: (userId: string, payload: UpdateUserPayload) => Promise<User>
  onCompleted: () => void
}

export const UserDialog = ({
  open,
  onOpenChange,
  mode,
  accessToken,
  userId,
  getUserById,
  createUser,
  updateUser,
  onCompleted
}: UserDialogProps) => {
  const { t } = useTranslation(translations)
  const { groups, fetchGroups, loading: groupsLoading } = useGroupManagement(accessToken)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: defaultCreateValues
  })

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(baseUserFormSchema),
    defaultValues: defaultEditValues
  })

  const activeForm = mode === 'create' ? createForm : editForm

  const resetForms = useCallback(() => {
    createForm.reset(defaultCreateValues)
    editForm.reset(defaultEditValues)
    setLoadError(null)
    setSubmitError(null)
  }, [createForm, editForm])

  useEffect(() => {
    if (!open || !accessToken) return
    if (mode === 'create') void fetchGroups({ limit: 200, offset: 0 })
  }, [open, accessToken, mode, fetchGroups])

  useEffect(() => {
    if (!open || mode !== 'edit' || !userId) return
    let cancelled = false
    const load = async () => {
      setLoadingUser(true)
      setLoadError(null)
      try {
        const user = await getUserById(userId)
        if (cancelled) return
        editForm.reset({
          active: user.active,
          givenName: user.givenName ?? '',
          familyName: user.familyName ?? '',
          middleName: user.middleName ?? '',
          nickname: user.nickname ?? '',
          preferredUsername: user.preferredUsername ?? '',
          email: user.email ?? '',
          locale: user.locale ?? '',
          employeeId: user.employeeId ?? ''
        })
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : t('user-management-dialog-load-error'))
      } finally {
        if (!cancelled) setLoadingUser(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, mode, userId, getUserById, editForm, t])

  useEffect(() => {
    if (!open) resetForms()
    else if (mode === 'create') createForm.reset(defaultCreateValues)
  }, [open, mode, resetForms, createForm])

  const mapSharedFields = (values: EditFormValues) => ({
    givenName: values.givenName || undefined,
    familyName: values.familyName || undefined,
    middleName: values.middleName || undefined,
    nickname: values.nickname || undefined,
    preferredUsername: values.preferredUsername,
    email: values.email || undefined,
    locale: values.locale || undefined,
    active: values.active
  })

  const onCreateSubmit = async (values: CreateFormValues) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createUser({
        ...mapSharedFields(values),
        employeeId: values.employeeId || undefined,
        password: values.password,
        groups: values.groupIds?.length ? values.groupIds : undefined
      })
      onCompleted()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('user-management-dialog-save-error'))
    } finally {
      setSubmitting(false)
    }
  }

  const onEditSubmit = async (values: EditFormValues) => {
    if (!userId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await updateUser(userId, {
        ...mapSharedFields(values),
        employeeId: values.employeeId === '' ? null : values.employeeId || undefined
      })
      onCompleted()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('user-management-dialog-save-error'))
    } finally {
      setSubmitting(false)
    }
  }

  const dialogFooter = (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        data-testid="user-management-user-dialog-cancel"
      >
        {t('user-management-action-cancel')}
      </Button>
      <Button type="submit" disabled={submitting} data-testid="user-management-user-dialog-submit">
        {t('user-management-action-save')}
      </Button>
    </DialogFooter>
  )

  const activeCheckbox = (
    <FormField
      control={activeForm.control}
      name="active"
      render={({ field }) => (
        <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-2">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              data-testid="user-management-user-dialog-active-checkbox"
            />
          </FormControl>
          <FormLabel className="gba:font-normal">{t('user-management-field-active')}</FormLabel>
        </FormItem>
      )}
    />
  )

  const textFields = (form: typeof createForm | typeof editForm) =>
    TEXT_FIELDS.map(({ name, labelKey, testId, inputType }) => (
      <FormField
        key={name}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(labelKey)}</FormLabel>
            <FormControl>
              <Input {...field} type={inputType ?? 'text'} value={field.value ?? ''} data-testid={testId} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ))

  const dialogBody =
    mode === 'edit' && loadingUser ? (
      <div className="gba:flex gba:justify-center gba:py-8" data-testid="user-management-user-dialog-loading">
        <Spinner />
      </div>
    ) : mode === 'create' ? (
      <Form {...createForm}>
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="gba:space-y-4">
          {activeCheckbox}
          {textFields(createForm)}
          <FormField
            control={createForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user-management-field-password')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    data-testid="user-management-user-dialog-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <UserDialogGroupSelect
            control={createForm.control}
            groups={groups}
            groupsLoading={groupsLoading}
            label={t('user-management-field-groups')}
          />
          {dialogFooter}
        </form>
      </Form>
    ) : (
      <Form {...editForm}>
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="gba:space-y-4">
          {activeCheckbox}
          {textFields(editForm)}
          {dialogFooter}
        </form>
      </Form>
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid="user-management-user-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('user-management-user-dialog-title-create')
              : t('user-management-user-dialog-title-edit')}
          </DialogTitle>
        </DialogHeader>
        {loadError && (
          <Alert variant="destructive" data-testid="user-management-user-dialog-load-alert">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {submitError && (
          <Alert variant="destructive" data-testid="user-management-user-dialog-submit-alert">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        {dialogBody}
      </DialogContent>
    </Dialog>
  )
}
