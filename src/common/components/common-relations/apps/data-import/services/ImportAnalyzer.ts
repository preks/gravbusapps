/**
 * Generic Import Analyzer Service
 * Uses AI agents to analyze CSV and suggest field mappings for any entity type
 */

import { flowbotClient } from '@/common/network/flowbot'
import { ImportAnalyzerResponse } from '../types'

export class ImportAnalyzer {
  constructor(
    private readonly accessToken: string,
    private readonly entityType: string
  ) {
    flowbotClient.setAccessToken(accessToken)
  }

  async analyzeImport(file: File, llmModel?: string): Promise<ImportAnalyzerResponse> {
    const response = await flowbotClient.mapFromFile(this.entityType, file, llmModel)

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
