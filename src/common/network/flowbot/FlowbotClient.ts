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
  llm_provider?: string
  llm_model?: string
}

export interface MapFromFileRequest {
  entity_type: string
  import_file: File
  model_kind?: string
  domain?: 'crm' | 'irm' | 'hr'
  /**
   * Wrapper key Flowbot must use to nest the imported subtype payload
   * (e.g. `'liquidFundInvestment'`). Sourced from the
   * `InvestmentGroup` catalog's `objectValue.requiredSubtypeKey`.
   * Always present on the wire — empty string when no subtype key
   * applies (CRM imports, or InvestmentGroup without a subtype key).
   */
  required_subtype_key?: string
  /**
   * JSON-stringified array of full dotted property paths for every
   * dynamic `additionalProperties.*` field declared anywhere in the
   * `InvestmentGroup` catalog subtree. Always present on the wire —
   * `'[]'` when no dynamic properties apply.
   */
  additional_properties_fields?: string
  /**
   * JSON-stringified object mapping short additional-property name to its
   * declared catalog `field.type` (e.g. `'AMOUNT' | 'DATE' | 'BOOLEAN' | …`).
   * Flowbot uses it to cast extracted cells to the right scalar before
   * persisting; otherwise everything lands as a string in the `jsonb`
   * column. `'{}'` (or omitted) means "no type hints, treat as TEXT".
   */
  additional_properties_field_types?: string
  /**
   * JSON-stringified array of tile field keys (`tileFields[].key`)
   * from the `InvestmentGroup` catalog subtree.
   */
  tile_fields?: string
}

export interface MapFromFileResponse {
  /** Canonical GQL schema type resolved by the backend (e.g. `"LiquidFundInvestment"`). */
  entityType?: string
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
  domain?: 'crm' | 'irm' | 'hr'
  import_file: File
  model_kind?: string
  mapping_json: string
  offset?: number
  max_rows?: number
  investment_company_group_ref?: string
}

export interface CsvQuality {
  totalRows: number
  shiftedRows: number
  smartMergedRows: number
  paddedRows: number
  repairAvailable: boolean
}

export interface ExtractFromFileResponse {
  entityType: string
  records: Array<Record<string, any>>
  ownershipUpdates?: Array<{
    rowIndex: number
    companyName?: string | null
    companyId?: string | null
    ownerCompanyNames: string[]
    ownerCompanyIds: string[]
    ownedCompanyNames: string[]
    ownedCompanyIds: string[]
  }>
  executiveUpdates?: Array<{
    rowIndex: number
    companyName?: string | null
    companyId?: string | null
    executiveNames: string[]
    executiveEmployeeIds: string[]
    executiveContactIds: string[]
    executiveSourceTypes: string[]
    executiveTypeRef?: string | null
  }>
  stakeholderUpdates?: Array<{
    rowIndex: number
    companyName?: string | null
    companyId?: string | null
    stakeholderNames: string[]
    stakeholderContactIds: string[]
    stakeholderAccountIds: string[]
    stakeholderSourceTypes: string[]
    stakeholderTypeRefs: (string | null)[]
    stakeholderTypeLabels: (string | null)[]
  }>
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
  csvQuality?: CsvQuality
}

export function toFlowbotDomain(domain?: string): 'crm' | 'irm' | 'hr' | undefined {
  if (domain === 'customer' || domain === 'crm') return 'crm'
  if (domain === 'investment' || domain === 'irm') return 'irm'
  if (domain === 'hr') return 'hr'
  return undefined
}

const FLOWBOT_IMPORT_MODEL_KIND_DEFAULT = 'default'

export interface TemplateTreeNode {
  name: string
  path: string
  children: TemplateTreeNode[]
}

export interface OrganizeDocumentsPayload {
  domain: 'crm' | 'irm'
  entityType: string
  entityId: string
  templateTree: TemplateTreeNode[]
  documents: Array<{
    id: string
    name: string
    mimeType?: string | null
    source?: 'uploaded_now' | 'existing_entity_doc'
  }>
  fallbackFolder?: string
  dryRun?: boolean
}

export interface OrganizationDecision {
  document_id: string
  target_folder_path: string
  confidence: number
  reason: string
}

export interface ResponseWarning {
  document_id?: string | null
  code: string
  message: string
}

export interface DocumentOrganizeResponse {
  decisions: OrganizationDecision[]
  summary: { total: number; organized: number; unsorted: number }
  warnings: ResponseWarning[]
  dry_run: boolean
}

export interface SuggestStructurePayload {
  domain: 'crm' | 'irm'
  entityType: string
  entityId: string
  documents: Array<{
    id: string
    name: string
    mimeType?: string | null
    source?: 'uploaded_now' | 'existing_entity_doc'
  }>
  preferences?: string
  currentTemplate?: TemplateTreeNode[] | null
  maxDepth?: number
  language?: string
}

export interface SuggestStructureResponse {
  proposed_template: TemplateTreeNode[]
  rationale: string[]
  document_assignments: OrganizationDecision[]
  warnings: ResponseWarning[]
}

export interface DocumentAutocompleteRequest {
  document_id?: string
  title?: string
  prefix_text: string
  suffix_text?: string
  max_tokens?: number
  llm_provider?: 'openai' | 'groq'
}

export interface DocumentAutocompleteResponse {
  completion_text: string
  finish_reason?: string | null
  latency_ms: number
  diagnostics?: string | null
}

// --- Virtual Assistants (orgchart registration for workforce agents) ---

export interface CreateVirtualAssistantKeycloakUserRequest {
  username: string
  email?: string
  first_name?: string
  last_name?: string
  enabled?: boolean
}

export interface CreateVirtualAssistantKeycloakUserResponse {
  user_id: string
}

export interface CreateVirtualAssistantRequest {
  /** Existing Keycloak user UUID the employee record will be linked to. */
  user_id: string
  first_name: string
  last_name: string
  display_name?: string
  /** Created (or reused) and linked to the orgchart assignment when set. */
  job_position_name?: string
  org_unit_id?: string
  org_unit_name?: string
}

export interface CreateVirtualAssistantResponse {
  employee_id: string
  user_id: string
  org_unit_id: string
  structure_id: string
  job_position_id?: string | null
}

export class FlowbotClient extends RestClient {
  constructor() {
    // Driven by NEXT_PUBLIC_FLOWBOT_ENDPOINT (or NEXT_PUBLIC_BASE_URL fallback). See resolveFlowbotBaseUrl.
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
    modelKind: string = FLOWBOT_IMPORT_MODEL_KIND_DEFAULT,
    domain?: string,
    requiredSubtypeKey?: string | null,
    additionalPropertiesFields?: readonly string[] | null,
    tileFieldKeys?: readonly string[] | null,
    additionalPropertiesFieldTypes?: Readonly<Record<string, string>> | null,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MapFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    const flowbotDomain = toFlowbotDomain(domain)
    if (flowbotDomain) {
      formData.append('domain', flowbotDomain)
    }
    formData.append('import_file', importFile)
    formData.append('model_kind', modelKind)
    if (flowbotDomain === 'irm') {
      formData.append('required_subtype_key', requiredSubtypeKey ?? '')
      formData.append('additional_properties_fields', JSON.stringify(additionalPropertiesFields ?? []))
      formData.append('additional_properties_field_types', JSON.stringify(additionalPropertiesFieldTypes ?? {}))
      formData.append('tile_fields', JSON.stringify(tileFieldKeys ?? []))
    }

    return this.post<MapFromFileResponse>('/flowbot/extraction/data/entities/map-from-file', formData, options)
  }

  public async extractFromFile(
    entityType: string,
    importFile: File,
    mappingJson: string,
    enforcedFieldsJson?: string,
    domain?: string,
    modelKind: string = FLOWBOT_IMPORT_MODEL_KIND_DEFAULT,
    offset: number = 0,
    maxRows: number = 5000,
    repairCsv: 'auto' | 'hard' = 'auto',
    requiredSubtypeKey?: string | null,
    additionalPropertiesFields?: readonly string[] | null,
    tileFieldKeys?: readonly string[] | null,
    investmentCompanyGroupRef?: string | null,
    additionalPropertiesFieldTypes?: Readonly<Record<string, string>> | null,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ExtractFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    const flowbotDomain = toFlowbotDomain(domain)
    if (flowbotDomain) {
      formData.append('domain', flowbotDomain)
    }
    formData.append('import_file', importFile)
    formData.append('model_kind', modelKind)
    formData.append('mapping_json', mappingJson)
    if (enforcedFieldsJson) {
      formData.append('enforced_fields_json', enforcedFieldsJson)
    }
    if (flowbotDomain === 'irm' && requiredSubtypeKey) {
      formData.append('required_subtype_key', requiredSubtypeKey)
    }
    if (flowbotDomain === 'irm') {
      formData.append('additional_properties_fields', JSON.stringify(additionalPropertiesFields ?? []))
      formData.append('additional_properties_field_types', JSON.stringify(additionalPropertiesFieldTypes ?? {}))
      formData.append('tile_fields', JSON.stringify(tileFieldKeys ?? []))
    }
    if (flowbotDomain === 'irm' && investmentCompanyGroupRef) {
      formData.append('investment_company_group_ref', investmentCompanyGroupRef)
    }
    formData.append('offset', offset.toString())
    formData.append('max_rows', maxRows.toString())
    formData.append('repair_csv', repairCsv)

    return this.post<ExtractFromFileResponse>('/flowbot/extraction/data/entities/extract-from-file', formData, options)
  }

  public async organizeDocuments(
    payload: OrganizeDocumentsPayload,
    files?: File[],
    modelKind?: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DocumentOrganizeResponse> {
    const formData = new FormData()
    formData.append('payload', JSON.stringify(payload))
    if (modelKind) formData.append('model_kind', modelKind)
    files?.forEach(f => formData.append('files', f))
    return this.post<DocumentOrganizeResponse>('/flowbot/document-organization/organize', formData, options)
  }

  public async suggestDocumentStructure(
    payload: SuggestStructurePayload,
    files?: File[],
    modelKind?: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<SuggestStructureResponse> {
    const formData = new FormData()
    formData.append('payload', JSON.stringify(payload))
    if (modelKind) formData.append('model_kind', modelKind)
    files?.forEach(f => formData.append('files', f))
    return this.post<SuggestStructureResponse>('/flowbot/document-organization/suggest-structure', formData, options)
  }

  public async getDocumentAutocomplete(
    request: DocumentAutocompleteRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DocumentAutocompleteResponse> {
    return this.post<DocumentAutocompleteResponse>('/text-generation/document-autocomplete', request, options)
  }

  /**
   * Create a Keycloak user for a virtual assistant (workforce agent identity).
   * Dev-tenant only; 503 when KEYCLOAK_USER_CREATION_ENABLED is off — callers
   * should let the operator supply an existing user id instead.
   */
  public async createVirtualAssistantKeycloakUser(
    request: CreateVirtualAssistantKeycloakUserRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CreateVirtualAssistantKeycloakUserResponse> {
    return this.post<CreateVirtualAssistantKeycloakUserResponse>(
      '/flowbot/api/virtual-assistants/keycloak-user',
      request,
      options
    )
  }

  /** Register a virtual assistant employee in the orgchart (dev-tenant only). */
  public async createVirtualAssistant(
    request: CreateVirtualAssistantRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CreateVirtualAssistantResponse> {
    return this.post<CreateVirtualAssistantResponse>('/flowbot/api/virtual-assistants', request, options)
  }
}

export const flowbotClient = new FlowbotClient()
