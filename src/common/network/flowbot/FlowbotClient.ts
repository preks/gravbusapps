import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'

export interface QuickTipsRequest {
  ticket_data: Record<string, any>
}

export interface QuickTipsResponse {
  quick_tips?: string
  suggestions?: string
  recommendations?: string[]
  analysis?: string
  // Add other response fields as needed based on actual API response
}

export interface TranslationRequest {
  texts: string[]
  target_language?: string
}

export interface TranslationResponse {
  translations: string[]
  languages: string[]
  confidences: number[]
}

export interface TextGenerationRequest {
  texts: string[]
  action: 'summarize' | 'generate'
}

export interface TextGenerationResponse {
  generated_texts: string[]
}

export interface EvalsDashboardQueryParams {
  workflow?: string
  from_ts?: string
  to_ts?: string
  bucket?: 'hour' | 'day'
  include_split_view?: boolean
}

export interface MapFromFileRequest {
  entity_type: string
  import_file: File
  llm_model?: string
}

export interface MapFromFileResponse {
  fieldMappings: Array<{
    sourceField: string
    targetField: string
    transformationType: 'direct' | 'catalog'
    catalogIdentifier?: string | null
  }>
  sourceFields: string[]
  unmappedSourceFields: string[]
  totalRowsRead?: number
}

export interface ExtractFromFileRequest {
  entity_type: string
  import_file: File
  mapping_json: string
  offset?: number
  max_rows?: number
}

export interface ExtractFromFileResponse {
  entityType: 'Lead' | 'Contact' | 'Account' | 'Opportunity'
  records: Array<Record<string, any>>
  totalRowsRead: number
  warnings: string[]
  fieldMappings: Array<{
    sourceField: string
    targetField: string
    transformationType: 'direct' | 'catalog'
    catalogIdentifier?: string | null
  }>
  sourceFields: string[]
  unmappedSourceFields: string[]
}

export class FlowbotClient extends RestClient {
  constructor() {
    // Use environment-aware base URL (localhost → dev → env NEXT_PUBLIC_FLOWBOT_ENDPOINT / NEXT_PUBLIC_BASE_URL)
    const baseUrl = resolveFlowbotBaseUrl()
    super(baseUrl, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  public async getQuickTipsForTicket(
    ticketData: Record<string, any>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QuickTipsResponse> {
    const requestBody: QuickTipsRequest = {
      ticket_data: ticketData
    }

    return this.post<QuickTipsResponse>('/services/quick-tips-for-ticket/', requestBody, options)
  }

  public async translate(
    texts: string[],
    targetLanguage?: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TranslationResponse> {
    const requestBody: TranslationRequest = {
      texts,
      ...(targetLanguage && { target_language: targetLanguage })
    }

    return this.post<TranslationResponse>('/translation/translate', requestBody, options)
  }

  public async generateText(
    texts: string[],
    action: 'summarize' | 'generate' = 'summarize',
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TextGenerationResponse> {
    const requestBody: TextGenerationRequest = {
      texts,
      action
    }

    return this.post<TextGenerationResponse>('/api/text-generation/generate', requestBody, options)
  }

  public async getEvalsDashboard<T = any>(
    params: EvalsDashboardQueryParams = {},
    options: Omit<RequestOptions, 'body' | 'params'> = {}
  ): Promise<T> {
    const cleanedParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<
      string,
      string | number | boolean
    >

    return this.get<T>('/flowbot/analytics/evals/dashboard', { ...options, params: cleanedParams })
  }

  public async mapFromFile(
    entityType: string,
    importFile: File,
    llmModel?: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MapFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    formData.append('import_file', importFile)
    if (llmModel) {
      formData.append('llm_model', llmModel)
    }

    return this.post<MapFromFileResponse>('/extraction/data/entities/map-from-file', formData, options)
  }

  public async extractFromFile(
    entityType: string,
    importFile: File,
    mappingJson: string,
    enforcedFieldsJson?: string,
    offset: number = 0,
    maxRows: number = 5000,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ExtractFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    formData.append('import_file', importFile)
    formData.append('mapping_json', mappingJson)
    if (enforcedFieldsJson) {
      formData.append('enforced_fields_json', enforcedFieldsJson)
    }
    formData.append('offset', offset.toString())
    formData.append('max_rows', maxRows.toString())

    return this.post<ExtractFromFileResponse>('/extraction/data/entities/extract-from-file', formData, options)
  }
}

export const flowbotClient = new FlowbotClient()
