import React, { useMemo } from 'react'
import { type FieldValues } from 'react-hook-form'
import { z } from 'zod'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import FormWrapperModal from '@/components/form-wrapper/FormWrapperModal'
import type { SkillCategoryRecord } from '../types'
import translations from '../_i18n'

interface CategoryFormDialogProps {
  category?: SkillCategoryRecord | null
  childAddButton?: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  onSubmit: (data: FieldValues) => void | Promise<void>
  isLoading?: boolean
  prefixDataTestId?: string
}

export default function CategoryFormDialog({
  category,
  childAddButton,
  open,
  setOpen,
  onSubmit,
  isLoading,
  prefixDataTestId
}: Readonly<CategoryFormDialogProps>) {
  const { t } = useTranslation(translations)
  const isEditing = !!category

  const categorySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('category-form-name-required')),
        description: z.string().optional()
      }),
    [t]
  )

  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? '',
      description: category?.description ?? ''
    }),
    [category?.id, category?.name, category?.description]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={isEditing ? t('category-edit') : t('category-add')}
      onSubmit={onSubmit}
      loading={isLoading}
      isEditing={isEditing}
      schema={categorySchema}
      defaultValues={defaultValues}
      open={open}
      setOpen={setOpen}
      dataTestId={`${prefixDataTestId ?? ''}-CategoryFormDialog`}
    >
      <div className="gba:space-y-4">
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('category-form-name-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('category-form-name-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('category-form-description-label')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('category-form-description-placeholder')}
                  className="gba:min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}
