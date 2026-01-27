/**
 * Generic Import Analyzer Service
 * Uses AI agents to analyze CSV and suggest field mappings for any entity type
 */

import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ImportAnalyzerResponse } from '../types'

export class ImportAnalyzer {
  private agentIdCache: string | null = null

  constructor(
    accessToken: string,
    private readonly agentName: string
  ) {
    promptManagerClient.setAccessToken(accessToken)
  }

  private async getAgentId(): Promise<string> {
    if (this.agentIdCache) {
      return this.agentIdCache
    }

    const response = await promptManagerClient.getPrompts({
      promptName: this.agentName,
      limit: 1,
      returnTotalRecords: false
    })

    if (!response.data || response.data.length === 0) {
      throw new Error(`Agent "${this.agentName}" not found`)
    }

    const agentId = response.data[0]._id
    if (!agentId) {
      throw new Error(`Agent "${this.agentName}" has no ID`)
    }

    this.agentIdCache = agentId
    return agentId
  }

  async analyzeImport(file: File): Promise<ImportAnalyzerResponse> {
    const formData = new FormData()

    // CRITICAL: Both system_params and user_params need importData parameter
    // Backend will inject file content into these empty parameters
    formData.append(
      'system_params',
      JSON.stringify({
        importData: ''
      })
    )
    formData.append(
      'user_params',
      JSON.stringify({
        importData: ''
      })
    )

    // Add file - backend will extract content and inject into importData parameters
    formData.append('files', file)

    const agentId = await this.getAgentId()
    const response = await promptManagerClient.executePromptById(agentId, formData)

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const result: ImportAnalyzerResponse = JSON.parse(content)

    return result
  }
}
