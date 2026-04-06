'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
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
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { GroupRecord } from '@/common/network/users/types'
import translations from '../../../../_i18n'

const groupFormSchema = z.object({
  name: z.string().min(1, 'um-group-dialog-name-required'),
  displayName: z.string().optional(),
  description: z.string().optional()
})

export type GroupDialogFormValues = z.infer<typeof groupFormSchema>

export interface GroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  group?: GroupRecord | null
  onSubmit: (values: GroupDialogFormValues) => Promise<void>
  submitting?: boolean
}

export const GroupDialog: React.FC<GroupDialogProps> = ({
  open,
  onOpenChange,
  mode,
  group,
  onSubmit,
  submitting = false
}) => {
  const { t } = useTranslation(translations)
  const form = useForm<GroupDialogFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: '', displayName: '', description: '' }
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && group) {
      form.reset({
        name: group.name ?? '',
        displayName: group.displayName ?? '',
        description: group.description ?? ''
      })
    } else {
      form.reset({ name: '', displayName: '', description: '' })
    }
  }, [open, mode, group, form])

  const handleSubmit = form.handleSubmit(async values => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="user-management-groups-dialog-group-root">
        <DialogHeader>
          <DialogTitle data-testid="user-management-groups-dialog-group-title">
            {mode === 'create' ? t('um-group-dialog-create-title') : t('um-group-dialog-edit-title')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="gba:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('um-group-dialog-name')}</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="user-management-groups-dialog-group-input-name" autoComplete="off" />
                  </FormControl>
                  <FormMessage>
                    {form.formState.errors.name?.message === 'um-group-dialog-name-required'
                      ? t('um-group-dialog-name-required')
                      : form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('um-group-dialog-display-name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="user-management-groups-dialog-group-input-display-name"
                      autoComplete="off"
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
                  <FormLabel>{t('um-group-dialog-description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="user-management-groups-dialog-group-input-description" rows={3} />
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
                data-testid="user-management-groups-dialog-group-button-cancel"
              >
                {t('um-group-dialog-cancel')}
              </Button>
              <Button type="submit" disabled={submitting} data-testid="user-management-groups-dialog-group-button-save">
                {t('um-group-dialog-save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
