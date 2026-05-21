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
  Switch,
  useTranslation
} from '@newwork/nw-design-system'
import FormWrapperModal from '@/components/form-wrapper/FormWrapperModal'
import type { SkillRecord, SkillDirectoryRecord } from '../types'
import translations from '../_i18n'

interface SkillFormDialogProps {
  skill?: SkillRecord | SkillDirectoryRecord | null
  childAddButton?: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  onSubmit: (data: FieldValues) => void | Promise<void>
  isLoading?: boolean
  prefixDataTestId?: string
}

export default function SkillFormDialog({
  skill,
  childAddButton,
  open,
  setOpen,
  onSubmit,
  isLoading,
  prefixDataTestId
}: Readonly<SkillFormDialogProps>) {
  const { t } = useTranslation(translations)
  const isEditing = !!skill

  const skillSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('skill-form-name-required')),
        description: z.string().optional(),
        levelScale: z.coerce.number().min(1).max(100).optional().or(z.literal('')),
        mandatory: z.boolean().optional()
      }),
    [t]
  )

  const defaultValues = useMemo(
    () => ({
      name: skill?.name ?? '',
      description: skill?.description ?? '',
      levelScale: (skill && 'levelScale' in skill ? skill.levelScale : null) ?? '',
      mandatory: (skill && 'mandatory' in skill ? skill.mandatory : false) ?? false
    }),
    [skill?.id, skill?.name, skill?.description]
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

        <FormField
          name="levelScale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('skill-form-level-scale-label')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder={t('skill-form-level-scale-placeholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
