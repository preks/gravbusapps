import type { FieldValues } from 'react-hook-form'
import * as z from 'zod'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { TranslationFieldName } from './AssetCatalogTranslationFields'

const noLeadingWhitespace = (value: string) => value === value.trimStart()

const TRANSLATION_LOCALE_FIELDS: Array<{ localeCode: string; fieldName: TranslationFieldName }> = [
  { localeCode: 'en-US', fieldName: 'translationEnUs' },
  { localeCode: 'de-DE', fieldName: 'translationDeDe' },
  { localeCode: 'ro-RO', fieldName: 'translationRoRo' }
]

export const getTranslationValue = (translations: CatalogEntry['translations'] | undefined, localeCode: string) => {
  return (
    translations?.find(translation => translation.localeCode?.toLowerCase() === localeCode.toLowerCase())?.value ?? ''
  )
}

const buildTranslationFieldSchema = (msgs: { nameTooLong: string; noLeadingWhitespace: string }) =>
  z
    .string()
    .max(64, msgs.nameTooLong)
    .refine(value => !value || noLeadingWhitespace(value), msgs.noLeadingWhitespace)
    .optional()

const buildTranslationFormFields = (msgs: { nameTooLong: string; noLeadingWhitespace: string }) => ({
  translationEnUs: buildTranslationFieldSchema(msgs),
  translationDeDe: buildTranslationFieldSchema(msgs),
  translationRoRo: buildTranslationFieldSchema(msgs)
})

export const buildAssetCatalogEntryFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  descriptionTooLong: string
  noLeadingWhitespace: string
}) =>
  z.object({
    value: z
      .string({ message: msgs.nameRequired })
      .min(1, msgs.nameRequired)
      .max(64, msgs.nameTooLong)
      .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
    code: z.string().optional(),
    description: z
      .string()
      .max(100, msgs.descriptionTooLong)
      .refine(val => !val || noLeadingWhitespace(val), msgs.noLeadingWhitespace)
      .optional(),
    ...buildTranslationFormFields(msgs)
  })

export const buildCreateAssetCatalogEntryFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  codeRequired: string
  codeTooLong: string
  descriptionTooLong: string
  noLeadingWhitespace: string
}) =>
  buildAssetCatalogEntryFormSchema(msgs).extend({
    code: z
      .string({ message: msgs.codeRequired })
      .min(1, msgs.codeRequired)
      .max(10, msgs.codeTooLong)
      .refine(noLeadingWhitespace, msgs.noLeadingWhitespace)
  })

export const buildCreateTranslations = (data: FieldValues): NonNullable<CatalogEntry['translations']> => {
  return TRANSLATION_LOCALE_FIELDS.map(({ localeCode, fieldName }) => ({
    localeCode,
    value: String(data[fieldName] ?? '').trim()
  })).filter(translation => translation.value)
}

const upsertTranslation = (
  translations: NonNullable<CatalogEntry['translations']>,
  localeCode: string,
  patch: { value?: string; additionalValue1?: string }
) => {
  const existingIndex = translations.findIndex(
    translation => translation.localeCode?.toLowerCase() === localeCode.toLowerCase()
  )

  if (existingIndex >= 0) {
    translations[existingIndex] = { ...translations[existingIndex], localeCode, ...patch }
    return
  }

  translations.push({ localeCode, ...patch })
}

export const buildUpdateTranslations = (
  existingTranslations: CatalogEntry['translations'] | undefined,
  data: FieldValues,
  userLocale: string,
  description: string,
  fallbackValue: string
): NonNullable<CatalogEntry['translations']> => {
  const nextTranslations = Array.isArray(existingTranslations) ? [...existingTranslations] : []

  TRANSLATION_LOCALE_FIELDS.forEach(({ localeCode, fieldName }) => {
    const value = String(data[fieldName] ?? '').trim()
    const hasExistingTranslation = nextTranslations.some(
      translation => translation.localeCode?.toLowerCase() === localeCode.toLowerCase()
    )

    if (value || hasExistingTranslation) {
      upsertTranslation(nextTranslations, localeCode, { value })
    }
  })

  const currentLocaleValue = TRANSLATION_LOCALE_FIELDS.find(
    ({ localeCode }) => localeCode.toLowerCase() === userLocale.toLowerCase()
  )?.fieldName
  const translatedValue = currentLocaleValue ? String(data[currentLocaleValue] ?? '').trim() : ''

  upsertTranslation(nextTranslations, userLocale, {
    value: translatedValue || fallbackValue,
    additionalValue1: description
  })

  return nextTranslations
}
