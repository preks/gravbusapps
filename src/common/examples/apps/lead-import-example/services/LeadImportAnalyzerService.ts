import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface FieldMapping {
  sourceField: string
  targetField: string
  transformationType: 'direct' | 'catalog'
  catalogIdentifier?: string
}

export interface LeadImportAnalyzerResponse {
  fieldMappings: FieldMapping[]
  sourceFields: string[]
  unmappedSourceFields: string[]
}

export class LeadImportAnalyzerService {
  private readonly AGENT_NAME = 'LeadImportAnalyzer'
  private readonly promptManagerClient: PromptManagerClient
  private agentIdCache: string | null = null

  constructor(promptManagerClient: PromptManagerClient) {
    this.promptManagerClient = promptManagerClient
  }

  private async getAgentId(): Promise<string> {
    if (this.agentIdCache) {
      return this.agentIdCache
    }

    const response = await this.promptManagerClient.getPrompts({
      promptName: this.AGENT_NAME,
      limit: 1,
      returnTotalRecords: false
    })

    if (!response.data || response.data.length === 0) {
      throw new Error(`Agent "${this.AGENT_NAME}" not found`)
    }

    const agentId = response.data[0]._id
    if (!agentId) {
      throw new Error(`Agent "${this.AGENT_NAME}" has no ID`)
    }

    this.agentIdCache = agentId
    return agentId
  }

  async analyzeImport(file: File): Promise<LeadImportAnalyzerResponse> {
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
    const response = await this.promptManagerClient.executePromptById(agentId, formData)

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const result: LeadImportAnalyzerResponse = JSON.parse(content)

    return result
  }
}
