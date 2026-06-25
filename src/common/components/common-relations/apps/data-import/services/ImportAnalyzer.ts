/**
 * Generic Import Analyzer Service
 * Uses AI agents to analyze CSV and suggest field mappings for any entity type.
 *
 * Optionally accepts an LLM context object (`ImportAnalyzerContext`) that
 * is forwarded as form-data fields to Flowbot's `map-from-file`. The
 * context lets the LLM reason about dynamic, user-configurable
 * `additionalProperties.*` attributes that are not part of the
 * static database schema. Construction of the context is the caller's
 * responsibility — see `aggregateInvestmentGroupContext`.
 */

import { flowbotClient } from '@/common/network/flowbot'
import { ImportAnalyzerResponse } from '../types'

export interface ImportAnalyzerContext {
  /** `objectValue.requiredSubtypeKey` from the InvestmentGroup root entry. */
  requiredSubtypeKey?: string
  /** Full dotted property paths of dynamic `additionalProperties.*` fields. */
  additionalPropertiesFields?: readonly string[]
  /**
   * Catalog `field.type` (e.g. `'AMOUNT' | 'DATE' | 'TEXT' | ...`) per short
   * additional-property name. Lets Flowbot cast cells to the right scalar
   * before persisting; without this, every `additionalProperties.*` cell
   * lands as a string and breaks numeric/date filtering on the jsonb column.
   */
  additionalPropertiesFieldTypes?: Readonly<Record<string, string>>
  /** Keys from `objectValue.tileFields[].key` across the InvestmentGroup subtree. */
  tileFieldKeys?: readonly string[]
}

export class ImportAnalyzer {
  constructor(
    private readonly accessToken: string,
    private readonly entityType: string,
    private readonly domain: 'customer' | 'investment' | 'hr'
  ) {
    flowbotClient.setAccessToken(accessToken)
  }

  async analyzeImport(
    file: File,
    context?: ImportAnalyzerContext,
    modelKind: string = 'default'
  ): Promise<ImportAnalyzerResponse> {
    const response = await flowbotClient.mapFromFile(
      this.entityType,
      file,
      modelKind,
      this.domain,
      context?.requiredSubtypeKey,
      context?.additionalPropertiesFields,
      context?.tileFieldKeys,
      context?.additionalPropertiesFieldTypes
    )

    return {
      fieldMappings: response.fieldMappings.map(mapping => ({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        transformationType: mapping.transformationType,
        catalogIdentifier: mapping.catalogIdentifier ?? undefined
      })),
      sourceFields: response.sourceFields,
      unmappedSourceFields: response.unmappedSourceFields,
      totalRowsRead: response.totalRowsRead
    }
  }
}
