import {
  ConvertedEntity,
  EntityPreviewBadge,
  EntityPreviewBadgeConfig,
  EntityPreviewCardData,
  EntityPreviewConfig,
  EntityPreviewFooterItem,
  EntityPreviewRow,
  EntityPreviewRowConfig,
  EntityPreviewTextConfig,
  ImportConfig
} from '@/common/components/common-relations/apps/data-import/types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_FALLBACK_FIELDS = 6

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getEntityValue(entity: ConvertedEntity, key: string): unknown {
  if (key in entity) return entity[key]
  const [root, field] = key.split('.')
  const rootValue = entity[root]
  return isRecord(rootValue) ? rootValue[field] : undefined
}

function humanizeKey(key: string): string {
  const lastPart = key.includes('.') ? (key.split('.').pop() ?? key) : key
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function toDisplayString(value: unknown, catalogValueByRef?: Map<string, string>): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string') {
    const catalogValue = catalogValueByRef?.get(value)
    if (catalogValue) return catalogValue
    return UUID_PATTERN.test(value) ? undefined : value
  }
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return undefined
}

function getFieldValue(
  entity: ConvertedEntity,
  field: string,
  catalogValueByRef?: Map<string, string>
): string | undefined {
  return toDisplayString(getEntityValue(entity, field), catalogValueByRef)
}

function getTextValue(
  entity: ConvertedEntity,
  textConfig: EntityPreviewTextConfig,
  catalogValueByRef?: Map<string, string>
): string | undefined {
  const separator = textConfig.separator ?? ' '
  const value = textConfig.fields
    .map(field => getFieldValue(entity, field, catalogValueByRef))
    .filter((fieldValue): fieldValue is string => Boolean(fieldValue))
    .join(separator)

  if (value) return value

  return textConfig.fallbackFields
    ?.map(field => getFieldValue(entity, field, catalogValueByRef))
    .find((fieldValue): fieldValue is string => Boolean(fieldValue))
}

function buildBadge(
  entity: ConvertedEntity,
  badgeConfig: EntityPreviewBadgeConfig,
  catalogValueByRef?: Map<string, string>
): EntityPreviewBadge | undefined {
  const value = getFieldValue(entity, badgeConfig.field, catalogValueByRef)
  return value ? { value, variant: badgeConfig.variant } : undefined
}

function buildAmountWithCurrencyRow(
  entity: ConvertedEntity,
  rowConfig: EntityPreviewRowConfig,
  catalogValueByRef?: Map<string, string>
): string | undefined {
  if (!rowConfig.field || !rowConfig.currencyField) return undefined
  const amount = getFieldValue(entity, rowConfig.field, catalogValueByRef)
  if (!amount) return undefined
  const currency = getFieldValue(entity, rowConfig.currencyField, catalogValueByRef)
  return [amount, currency].filter(Boolean).join(' ')
}

function buildRow(
  entity: ConvertedEntity,
  rowConfig: EntityPreviewRowConfig,
  catalogValueByRef?: Map<string, string>
): EntityPreviewRow | undefined {
  const value =
    rowConfig.format === 'amountWithCurrency'
      ? buildAmountWithCurrencyRow(entity, rowConfig, catalogValueByRef)
      : (rowConfig.fields ?? (rowConfig.field ? [rowConfig.field] : []))
          .map(field => getFieldValue(entity, field, catalogValueByRef))
          .filter((fieldValue): fieldValue is string => Boolean(fieldValue))
          .join(rowConfig.separator ?? ', ')

  const badges = rowConfig.badges
    ?.map(badgeConfig => buildBadge(entity, badgeConfig, catalogValueByRef))
    .filter((badge): badge is EntityPreviewBadge => Boolean(badge))

  if (!value && (!badges || badges.length === 0)) return undefined

  return {
    label: rowConfig.label,
    value: value ?? '',
    icon: rowConfig.icon,
    badges
  }
}

function buildFooterItem(
  entity: ConvertedEntity,
  field: string,
  icon: EntityPreviewFooterItem['icon'],
  catalogValueByRef?: Map<string, string>
): EntityPreviewFooterItem | undefined {
  const value = getFieldValue(entity, field, catalogValueByRef)
  return value ? { value, icon } : undefined
}

function buildFromConfig(
  entity: ConvertedEntity,
  previewConfig: EntityPreviewConfig,
  catalogValueByRef?: Map<string, string>
): EntityPreviewCardData {
  return {
    title: getTextValue(entity, previewConfig.title, catalogValueByRef) ?? '',
    badges:
      previewConfig.badges
        ?.map(badgeConfig => buildBadge(entity, badgeConfig, catalogValueByRef))
        .filter((badge): badge is EntityPreviewBadge => Boolean(badge)) ?? [],
    rows:
      previewConfig.rows
        ?.map(rowConfig => buildRow(entity, rowConfig, catalogValueByRef))
        .filter((row): row is EntityPreviewRow => Boolean(row)) ?? [],
    footerItems:
      previewConfig.footerItems
        ?.map(footerItem => buildFooterItem(entity, footerItem.field, footerItem.icon, catalogValueByRef))
        .filter((footerItem): footerItem is EntityPreviewFooterItem => Boolean(footerItem)) ?? []
  }
}

function buildFallbackPreview(entity: ConvertedEntity, catalogValueByRef?: Map<string, string>): EntityPreviewCardData {
  const rows: EntityPreviewRow[] = []

  for (const [key, value] of Object.entries(entity)) {
    if (rows.length >= MAX_FALLBACK_FIELDS) break

    if (isRecord(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (rows.length >= MAX_FALLBACK_FIELDS) break
        const displayValue = toDisplayString(nestedValue, catalogValueByRef)
        if (displayValue) rows.push({ label: humanizeKey(nestedKey), value: displayValue })
      }
    } else {
      const displayValue = toDisplayString(value, catalogValueByRef)
      if (displayValue) rows.push({ label: humanizeKey(key), value: displayValue })
    }
  }

  return {
    title: '',
    badges: [],
    rows,
    footerItems: []
  }
}

export function buildEntityPreviewCardData(
  entity: ConvertedEntity,
  config: ImportConfig,
  catalogValueByRef?: Map<string, string>
): EntityPreviewCardData {
  return config.preview
    ? buildFromConfig(entity, config.preview, catalogValueByRef)
    : buildFallbackPreview(entity, catalogValueByRef)
}
