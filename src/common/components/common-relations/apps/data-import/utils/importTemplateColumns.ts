/**
 * Pure helpers for deriving import-template columns from `ImportConfig`.
 * Headers use human-readable `label` values, not schema path codes.
 */

import type { ImportAnalyzerContext } from '@/common/components/common-relations/apps/data-import/services'
import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import type { ExcelColumn } from '@/common/utils/excelExportUtils'
import {
  fieldNameEndsWithIgnoreCase,
  stripLeadingPrefixIgnoreCase,
  stripTrailingSuffixIgnoreCase,
  trimAsciiWhitespace
} from './importTemplateLabelText'

const ADDITIONAL_PROPERTIES_SEGMENT = '.additionalProperties.'

const enforcedTargetFieldsToExclude = (config: ImportConfig): Set<string> => {
  const excluded = new Set<string>()
  for (const select of config.enforcedSelects ?? []) {
    const target = select.targetField.trim()
    if (target.length > 0) {
      excluded.add(target)
    }
  }
  return excluded
}

const buildDynamicAdditionalPropertyPaths = (
  config: ImportConfig,
  analyzerContext?: ImportAnalyzerContext
): string[] => {
  const payloadKey = config.investmentPayloadKey?.trim()
  const shortNames = analyzerContext?.additionalPropertiesFields
  if (!payloadKey || !shortNames?.length) {
    return []
  }

  const prefix = `${payloadKey}${ADDITIONAL_PROPERTIES_SEGMENT}`
  return shortNames
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => `${prefix}${name}`)
}

const shortNameFromAdditionalPropertyPath = (path: string): string => {
  const markerIndex = path.lastIndexOf(ADDITIONAL_PROPERTIES_SEGMENT)
  if (markerIndex === -1) {
    return path
  }
  return path.slice(markerIndex + ADDITIONAL_PROPERTIES_SEGMENT.length)
}

/** Template-only overrides where stripping suffixes is not enough. */
const TEMPLATE_LABEL_BY_FIELD_NAME: Readonly<Record<string, string>> = {
  ownerEmployeeId: 'Owner'
}

const isIdentifierFieldName = (fieldName: string): boolean =>
  fieldNameEndsWithIgnoreCase(fieldName, 'Id') && fieldName.toLowerCase() !== 'liquidationdate'

const isPostalCodeFieldName = (fieldName: string): boolean =>
  fieldName === 'postalCode' || fieldName.endsWith('.postalCode')

/** Entity business key (`code`, `employee.code`, …) — template column is always "Code". */
const isBusinessKeyCodeFieldName = (fieldName: string): boolean => fieldName === 'code' || fieldName.endsWith('.code')

/** Other `*Code` fields (e.g. `managerCode`) — drop a trailing " Code" from the label. */
const isReferenceCodeFieldName = (fieldName: string): boolean =>
  fieldNameEndsWithIgnoreCase(fieldName, 'Code') &&
  !isPostalCodeFieldName(fieldName) &&
  !isBusinessKeyCodeFieldName(fieldName)

/** Metadata parentheticals stripped from templates; descriptive ones like (Interest) stay. */
const TECHNICAL_PARENTHETICAL_SUFFIXES = ['(Catalog)', '(JSON)'] as const

const stripTechnicalParentheticals = (value: string): string => {
  let result = trimAsciiWhitespace(value)
  for (const suffix of TECHNICAL_PARENTHETICAL_SUFFIXES) {
    result = stripTrailingSuffixIgnoreCase(result, suffix)
  }
  return trimAsciiWhitespace(result)
}

/**
 * Shortens import-config labels for spreadsheet templates only.
 * Keeps descriptive parentheticals (e.g. Income (Interest), Planned Exit (Yes/No)).
 * Mapping UI keeps the full labels from `TargetFieldDefinition`.
 */
export const simplifyImportTemplateLabel = (schemaPath: string, label: string): string => {
  const fieldName = schemaPath.split('.').pop() ?? schemaPath
  const override = TEMPLATE_LABEL_BY_FIELD_NAME[fieldName]
  if (override) {
    return override
  }

  if (isBusinessKeyCodeFieldName(fieldName)) {
    return 'Code'
  }

  let simplified = trimAsciiWhitespace(label)
  simplified = stripLeadingPrefixIgnoreCase(simplified, 'Additional:')
  simplified = stripTechnicalParentheticals(simplified)
  simplified = stripTrailingSuffixIgnoreCase(simplified, 'Employee ID')

  if (isIdentifierFieldName(fieldName)) {
    simplified = stripTrailingSuffixIgnoreCase(simplified, 'ID')
  }

  if (isReferenceCodeFieldName(fieldName)) {
    simplified = stripTrailingSuffixIgnoreCase(simplified, 'Code')
  }

  simplified = stripTrailingSuffixIgnoreCase(simplified, 'URL')

  const result = trimAsciiWhitespace(simplified)
  return result || trimAsciiWhitespace(label)
}

/** Turns camelCase / snake_case identifiers into title-style words. */
export const humanizeFieldIdentifier = (identifier: string): string => {
  const withSpaces = identifier
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()

  return withSpaces
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (word.length <= 4 && word === word.toUpperCase()) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

const labelForAdditionalPropertyPath = (path: string, labelByPath: Map<string, string>): string => {
  const configured = labelByPath.get(path)
  if (configured) {
    return simplifyImportTemplateLabel(path, configured)
  }
  const shortName = shortNameFromAdditionalPropertyPath(path)
  return humanizeFieldIdentifier(shortName)
}

/**
 * Excel columns for an import template: `header` is the user-facing label;
 * static fields come from `targetFields`, minus enforced defaults, plus
 * runtime IRM `additionalProperties.*` when provided.
 */
export const buildImportTemplateColumns = (
  config: ImportConfig,
  analyzerContext?: ImportAnalyzerContext
): ExcelColumn[] => {
  const excluded = enforcedTargetFieldsToExclude(config)
  const labelByPath = new Map(
    config.targetFields
      .map(field => [field.value.trim(), field.label.trim()] as const)
      .filter(([value, label]) => value.length > 0 && label.length > 0)
  )

  const columns: ExcelColumn[] = []
  const seenValues = new Set<string>()
  const seenHeaders = new Set<string>()

  const addColumn = (schemaPath: string, header: string) => {
    const normalizedHeader = header.trim()
    if (!normalizedHeader || seenValues.has(schemaPath) || seenHeaders.has(normalizedHeader)) {
      return
    }
    seenValues.add(schemaPath)
    seenHeaders.add(normalizedHeader)
    columns.push({ header: normalizedHeader, key: schemaPath })
  }

  for (const field of config.targetFields) {
    const value = field.value.trim()
    const label = field.label.trim()
    if (!value || !label || excluded.has(value)) {
      continue
    }
    addColumn(value, simplifyImportTemplateLabel(value, label))
  }

  for (const path of buildDynamicAdditionalPropertyPaths(config, analyzerContext)) {
    addColumn(path, labelForAdditionalPropertyPath(path, labelByPath))
  }

  return columns
}
