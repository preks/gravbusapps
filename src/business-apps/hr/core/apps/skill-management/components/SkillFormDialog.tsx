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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  useTranslation
} from '@newwork/nw-design-system'
import FormWrapperModal from '@/components/form-wrapper/FormWrapperModal'
import type { SkillRecord, SkillDirectoryRecord, SkillCategoryRecord } from '../types'
import translations from '../_i18n'

interface SkillFormDialogProps {
  skill?: SkillRecord | SkillDirectoryRecord | null
  childAddButton?: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  onSubmit: (data: FieldValues) => void | Promise<void>
  isLoading?: boolean
  categories?: SkillCategoryRecord[]
  prefixDataTestId?: string
}

export default function SkillFormDialog({
  skill,
  childAddButton,
  open,
  setOpen,
  onSubmit,
  isLoading,
  categories = [],
  prefixDataTestId
}: Readonly<SkillFormDialogProps>) {
  const { t } = useTranslation(translations)
  const isEditing = !!skill

  const skillSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('skill-form-name-required')),
        description: z.string().optional(),
        categoryId: z.string().optional(),
        mandatory: z.boolean().optional()
      }),
    [t]
  )

  const defaultValues = useMemo(
    () => ({
      name: skill?.name ?? '',
      description: skill?.description ?? '',
      categoryId: skill?.skillCategoryId ?? '',
      mandatory: (skill && 'mandatory' in skill ? skill.mandatory : false) ?? false
    }),
    [
      skill?.id,
      skill?.name,
      skill?.description,
      skill?.skillCategoryId,
      skill && 'mandatory' in skill ? skill.mandatory : null
    ]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={isEditing ? t('edit-skill') : t('add-new-skill')}
      onSubmit={onSubmit}
      loading={isLoading}
      isEditing={isEditing}
      schema={skillSchema}
      defaultValues={defaultValues}
      open={open}
      setOpen={setOpen}
      dataTestId={`${prefixDataTestId ?? ''}-SkillFormDialog`}
    >
      <div className="gba:space-y-4">
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('skill-form-name-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('skill-form-name-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('skill-form-description-label')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('skill-form-description-placeholder')}
                  className="gba:min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {categories.length > 0 && (
          <FormField
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('skill-form-category-label')}</FormLabel>
                <FormControl>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="gba:w-full"
                      data-testid={`${prefixDataTestId ?? 'skill'}-category-select`}
                    >
                      <SelectValue placeholder={t('skill-form-category-placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          name="mandatory"
          render={({ field }) => (
            <FormItem className="gba:flex gba:items-center gba:gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="gba:!mt-0">{t('skill-form-mandatory-label')}</FormLabel>
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}
