import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert,
  AlertDescription,
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
  useTranslation
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import type { CreateRolePayload, RoleRecord, UpdateRolePayload } from '@/common/network/users/types'
import translations from '../../../../_i18n'

export type RoleDialogMode = 'create' | 'edit'

export interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: RoleDialogMode
  /** Keycloak role name used in the update API path when mode is `edit` */
  editingRoleName: string | null
  initialName?: string
  initialDescription?: string
  createRole: (payload: CreateRolePayload) => Promise<RoleRecord>
  updateRole: (roleName: string, payload: UpdateRolePayload) => Promise<RoleRecord>
  onCompleted: () => void
}

type RoleFormValues = {
  name: string
  description: string
}

export const RoleDialog = ({
  open,
  onOpenChange,
  mode,
  editingRoleName,
  initialName = '',
  initialDescription = '',
  createRole,
  updateRole,
  onCompleted
}: RoleDialogProps) => {
  const { t } = useTranslation(translations)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('user-management-roles-validation-name-required')),
        description: z.string().optional()
      }),
    [t]
  )

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' }
  })

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    form.reset({
      name: mode === 'edit' ? initialName : '',
      description: initialDescription ?? ''
    })
  }, [open, mode, initialName, initialDescription, form])

  const handleClose = () => {
    onOpenChange(false)
    setSubmitError(null)
  }

  const onSubmit = async (values: RoleFormValues) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (mode === 'create') {
        await createRole({
          name: values.name.trim(),
          description: values.description.trim() || undefined
        })
      } else {
        if (!editingRoleName) {
          setSubmitError(t('user-management-roles-dialog-missing-edit-target'))
          return
        }
        const trimmedName = values.name.trim()
        const trimmedDescription = values.description.trim()
        await updateRole(editingRoleName, {
          ...(trimmedName === editingRoleName ? {} : { name: trimmedName }),
          description: trimmedDescription || undefined
        })
      }
      onCompleted()
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('user-management-roles-dialog-submit-failed')
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid="user-management-roles-dialog-content">
        <DialogHeader>
          <DialogTitle data-testid="user-management-roles-dialog-title">
            {mode === 'create'
              ? t('user-management-roles-dialog-title-create')
              : t('user-management-roles-dialog-title-edit')}
          </DialogTitle>
        </DialogHeader>

        {submitError ? (
          <Alert variant="destructive" data-testid="user-management-roles-dialog-alert-error">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('user-management-roles-field-name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      autoComplete="off"
                      data-testid="user-management-roles-input-name"
                    />
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
                  <FormLabel>{t('user-management-roles-field-description')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} data-testid="user-management-roles-input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="user-management-roles-button-dialog-cancel"
              >
                {t('user-management-action-cancel')}
              </Button>
              <Button type="submit" disabled={submitting} data-testid="user-management-roles-button-dialog-submit">
                {t('user-management-action-save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export interface RolesDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string | null
  deleteError: string | null
  deleteSubmitting: boolean
  onConfirm: () => void
  onDismiss: () => void
}

export const RolesDeleteDialog = ({
  open,
  onOpenChange,
  roleName,
  deleteError,
  deleteSubmitting,
  onConfirm,
  onDismiss
}: RolesDeleteDialogProps) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="user-management-roles-dialog-delete">
        <DialogHeader>
          <DialogTitle>{t('user-management-roles-delete-title')}</DialogTitle>
        </DialogHeader>
        <p className="gba:text-sm gba:text-gray-700" data-testid="user-management-roles-delete-message">
          {roleName ? t('user-management-roles-delete-message', { name: roleName }) : null}
        </p>
        {deleteError ? (
          <Alert variant="destructive" data-testid="user-management-roles-delete-alert-error">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onDismiss}
            data-testid="user-management-roles-button-delete-cancel"
          >
            {t('user-management-action-cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteSubmitting}
            onClick={onConfirm}
            data-testid="user-management-roles-button-delete-confirm"
          >
            {t('user-management-roles-delete-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
