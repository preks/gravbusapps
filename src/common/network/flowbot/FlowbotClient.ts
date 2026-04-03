import { FLOWBOT_API_URL } from '@/common/utils/serviceResolver'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'

// ─── Quick Tips ───────────────────────────────────────────────────────────────

export interface QuickTipsRequest {
  ticket_data: Record<string, any>
}

export interface QuickTipsResponse {
  quick_tips?: string
  suggestions?: string
  recommendations?: string[]
  analysis?: string
}

// ─── Translation ──────────────────────────────────────────────────────────────

export interface TranslationRequest {
  texts: string[]
  target_language?: string
}

export interface TranslationResponse {
  translations: string[]
  languages: string[]
  confidences: number[]
}

export interface TranslateTextsRequest {
  input_texts: string[]
  target_language: string
}

export interface TranslateTextsResponse {
  translated_texts: string[]
}

// ─── Text Generation ──────────────────────────────────────────────────────────

export interface TextGenerationRequest {
  texts: string[]
  action: 'summarize' | 'generate'
}

export interface TextGenerationResponse {
  generated_texts: string[]
}

// ─── Analytics / Evals ────────────────────────────────────────────────────────

export interface EvalsDashboardQueryParams {
  workflow?: string
  from_ts?: string
  to_ts?: string
  bucket?: 'hour' | 'day'
  include_split_view?: boolean
  llm_provider?: string
  llm_model?: string
}

// ─── Data Import / Extraction ─────────────────────────────────────────────────

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

// ─── Document Autocomplete ────────────────────────────────────────────────────

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

// ─── Scheduled Tasks ─────────────────────────────────────────────────────────

export interface ScheduledTask {
  id: string
  user_id: string
  name: string
  description: string | null
  task_instruction: string
  schedule_type: 'interval' | 'cron' | 'daily' | 'weekly'
  schedule_description: string
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  next_run_at: string | null
  last_run_at: string | null
  run_count: number
  max_runs: number | null
  created_at: string
  updated_at: string
}

export interface TaskExecution {
  id: string
  task_id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'success' | 'failed'
  result_summary: string | null
  error_message: string | null
  delivered: boolean
}

export interface CreateScheduledTaskRequest {
  name: string
  description?: string
  task_instruction: string
  schedule_description: string
  max_runs?: number
  user_timezone?: string
}

export interface ScheduledTaskListResponse {
  tasks: ScheduledTask[]
  total: number
}

// ─── Hybrid Search ────────────────────────────────────────────────────────────

export interface HybridSearchSkillMatch {
  id: string
  name: string
  score?: number
  match_type?: string
  version: number
}

// ─── Agent Feedback ───────────────────────────────────────────────────────────

export interface AgentFeedbackRequest {
  session_id: string
  message_id: string | null
  feedback: 'like' | 'dislike'
  source: string
  assistant?: string
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export interface UserPreferencesUpdate {
  behavior_notes?: Array<{ text: string; source: 'user' | 'agent' }>
}

// ─── Expense Insights ─────────────────────────────────────────────────────────

export interface ExpenseInsightsRequest {
  expense_request_id: string
}

// ─── Workflow Drafts ──────────────────────────────────────────────────────────

export interface WorkflowDraftMeta {
  hash: string
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class FlowbotClient extends RestClient {
  constructor() {
    super(FLOWBOT_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Raw fetch against the Flowbot base, with authorization header injected.
   * Use this for SSE / streaming / blob endpoints that bypass the JSON RestClient.
   */
  fetchAuthenticated(path: string, init: RequestInit = {}): Promise<Response> {
    const authHeader = this.headers['Authorization']
    const initHeaders = (init.headers ?? {}) as Record<string, string>
    return fetch(this.baseUrl + path, {
      ...init,
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...initHeaders
      }
    })
  }

  // ─── Quick Tips ─────────────────────────────────────────────────────────────

  public async getQuickTipsForTicket(
    ticketData: Record<string, any>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QuickTipsResponse> {
    const requestBody: QuickTipsRequest = { ticket_data: ticketData }
    return this.post<QuickTipsResponse>('/services/quick-tips-for-ticket/', requestBody, options)
  }

  // ─── Translation ────────────────────────────────────────────────────────────

  /**
   * Translate texts with optional target language. Also used for language detection
   * (omit targetLanguage – the response languages[] contains the detected language).
   */
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

  /**
   * Translate a list of input texts to a target language.
   * Returns an array of translated strings in the same order.
   */
  public async translateTexts(
    inputTexts: string[],
    targetLanguage: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TranslateTextsResponse> {
    const requestBody: TranslateTextsRequest = {
      input_texts: inputTexts,
      target_language: targetLanguage
    }
    return this.post<TranslateTextsResponse>('/translation/translate_texts', requestBody, options)
  }

  // ─── Text Generation ────────────────────────────────────────────────────────

  public async generateText(
    texts: string[],
    action: 'summarize' | 'generate' = 'summarize',
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TextGenerationResponse> {
    const requestBody: TextGenerationRequest = { texts, action }
    return this.post<TextGenerationResponse>('/api/text-generation/generate', requestBody, options)
  }

  // ─── Analytics / Evals ──────────────────────────────────────────────────────

  public async getEvalsDashboard<T = any>(
    params: EvalsDashboardQueryParams = {},
    options: Omit<RequestOptions, 'body' | 'params'> = {}
  ): Promise<T> {
    const cleanedParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<
      string,
      string | number | boolean
    >
    return this.get<T>('/analytics/evals/dashboard', { ...options, params: cleanedParams })
  }

  // ─── Data Import / Extraction ────────────────────────────────────────────────

  public async mapFromFile(
    entityType: string,
    importFile: File,
    domain?: 'crm' | 'irm',
    llmModel?: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MapFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    formData.append('import_file', importFile)
    if (domain) formData.append('domain', domain)
    if (llmModel) formData.append('llm_model', llmModel)
    return this.post<MapFromFileResponse>('/extraction/data/entities/map-from-file', formData, options)
  }

  public async extractFromFile(
    entityType: string,
    importFile: File,
    mappingJson: string,
    enforcedFieldsJson?: string,
    domain?: 'crm' | 'irm',
    offset: number = 0,
    maxRows: number = 5000,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ExtractFromFileResponse> {
    const formData = new FormData()
    formData.append('entity_type', entityType)
    formData.append('import_file', importFile)
    formData.append('mapping_json', mappingJson)
    if (enforcedFieldsJson) formData.append('enforced_fields_json', enforcedFieldsJson)
    if (domain) formData.append('domain', domain)
    formData.append('offset', offset.toString())
    formData.append('max_rows', maxRows.toString())
    return this.post<ExtractFromFileResponse>('/extraction/data/entities/extract-from-file', formData, options)
  }

  public async extractInformation(formData: FormData, options: Omit<RequestOptions, 'body'> = {}): Promise<unknown> {
    return this.post<unknown>('/information-extraction/extract_information', formData, options)
  }

  // ─── Document Autocomplete ──────────────────────────────────────────────────

  public async getDocumentAutocomplete(
    request: DocumentAutocompleteRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DocumentAutocompleteResponse> {
    return this.post<DocumentAutocompleteResponse>('/text-generation/document-autocomplete', request, options)
  }

  // ─── Document Classification ─────────────────────────────────────────────────

  public async classifyDocument(
    formData: FormData,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/document-autoclassify/classify', formData, options)
  }

  // ─── Scheduled Tasks ────────────────────────────────────────────────────────

  public async createScheduledTask(
    request: CreateScheduledTaskRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ScheduledTask> {
    return this.post<ScheduledTask>('/api/scheduled-tasks/', request, options)
  }

  public async listScheduledTasks(
    params?: { include_paused?: boolean; limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ScheduledTaskListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.include_paused !== undefined) {
      queryParams.append('include_paused', String(params.include_paused))
    }
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.offset) queryParams.append('offset', String(params.offset))
    const queryString = queryParams.toString()
    const url = queryString ? `/api/scheduled-tasks/?${queryString}` : '/api/scheduled-tasks/'
    return this.get<ScheduledTaskListResponse>(url, options)
  }

  public async getScheduledTask(taskId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<ScheduledTask> {
    return this.get<ScheduledTask>(`/api/scheduled-tasks/${taskId}`, options)
  }

  public async pauseScheduledTask(
    taskId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/scheduled-tasks/${taskId}/pause`, {}, options)
  }

  public async resumeScheduledTask(
    taskId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/scheduled-tasks/${taskId}/resume`, {}, options)
  }

  public async deleteScheduledTask(
    taskId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/api/scheduled-tasks/${taskId}`, options)
  }

  public async getTaskExecutions(
    taskId: string,
    params?: { limit?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TaskExecution[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', String(params.limit))
    const queryString = queryParams.toString()
    const url = queryString
      ? `/api/scheduled-tasks/${taskId}/executions?${queryString}`
      : `/api/scheduled-tasks/${taskId}/executions`
    return this.get<TaskExecution[]>(url, options)
  }

  // ─── Hybrid Search (SSE) ─────────────────────────────────────────────────────

  /**
   * Server-sent events stream for hybrid skill search.
   * Returns the raw Response; callers must read the SSE stream themselves.
   * API: GET /flowbot/hybrid-search/{entity_type}?q=...&limit=...
   */
  public hybridSearchStream(entityType: string, q: string, limit: number = 20): Promise<Response> {
    const url = `/hybrid-search/${entityType}?${new URLSearchParams({
      q,
      limit: String(limit)
    })}`
    return this.fetchAuthenticated(url, {
      method: 'GET',
      headers: { Accept: 'text/event-stream' }
    })
  }

  // ─── Agent / Chat ────────────────────────────────────────────────────────────

  public async fetchSessionHistory(sessionId: string): Promise<unknown> {
    return this.get<unknown>(`/api/agent/session/${sessionId}/history`)
  }

  public async fetchChatList(limit: number = 15, offset: number = 0): Promise<unknown> {
    return this.get<unknown>(`/chat/user/chats?limit=${limit}&offset=${offset}`)
  }

  public async deleteChatSession(sessionId: string): Promise<void> {
    return this.delete<void>(`/chat/sessions/${sessionId}`)
  }

  /**
   * SSE: Stream agent v2 chat.
   * Accepts a pre-built FormData; returns raw Response for SSE consumption.
   */
  public streamAgentV2Chat(form: FormData, signal?: AbortSignal): Promise<Response> {
    return this.fetchAuthenticated('/api/agent/v2/chat', {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: form,
      signal
    })
  }

  /**
   * SSE: Stream document live-edit agent.
   * Returns raw Response for SSE consumption.
   */
  public streamDocumentLiveEdit(form: FormData, signal?: AbortSignal): Promise<Response> {
    return this.fetchAuthenticated('/api/agent/v2/document/live-edit', {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: form,
      signal
    })
  }

  public async postChatMessage(form: FormData): Promise<unknown> {
    return this.post<unknown>('/chat/messages', form)
  }

  public async addFilesToSession(form: FormData): Promise<unknown> {
    return this.post<unknown>('/api/agent/add_files', form)
  }

  public async cancelAgentChat(sessionId: string): Promise<void> {
    return this.post<void>('/api/agent/chat/cancel', { session_id: sessionId })
  }

  public async getPrechatSuggestions(form: FormData): Promise<unknown> {
    return this.post<unknown>('/api/agent/prechat-suggestions', form)
  }

  public async postAgentFeedback(
    request: AgentFeedbackRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<void> {
    return this.post<void>('/api/agent/feedback', request, options)
  }

  /**
   * Download a sandbox file as a Blob.
   */
  public async downloadSandboxFile(filePath: string): Promise<Blob> {
    const response = await this.fetchAuthenticated('/api/agent/download-sandbox-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath })
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP ${response.status}`)
    }
    return response.blob()
  }

  /**
   * SSE / audio: Text-to-speech.
   * Returns raw Response so callers can read the audio stream or blob.
   */
  public streamTextToSpeech(
    params: { text: string; voice: string; speed: number },
    signal?: AbortSignal
  ): Promise<Response> {
    return this.fetchAuthenticated('/api/agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal
    })
  }

  // ─── Workflow Drafts ─────────────────────────────────────────────────────────

  public async getWorkflowDraft(draftId: string): Promise<unknown> {
    return this.get<unknown>(`/api/agent/workflow-drafts/${draftId}`)
  }

  public async getWorkflowDraftMeta(draftId: string): Promise<WorkflowDraftMeta> {
    return this.get<WorkflowDraftMeta>(`/api/agent/workflow-drafts/${draftId}/meta`)
  }

  public async putWorkflowDraft(draftId: string, body: unknown): Promise<unknown> {
    return this.put<unknown>(`/api/agent/workflow-drafts/${draftId}`, body)
  }

  public async refineWorkflowDraft(draftId: string, body: unknown): Promise<unknown> {
    return this.post<unknown>(`/api/agent/workflow-drafts/${draftId}/refine`, body)
  }

  // ─── User Preferences ───────────────────────────────────────────────────────

  public async getPreferences<T = unknown>(): Promise<T> {
    return this.get<T>('/api/preferences')
  }

  public async getPreferencesSummary<T = unknown>(): Promise<T> {
    return this.get<T>('/api/preferences/summary')
  }

  public async updatePreferences<T = unknown>(updates: UserPreferencesUpdate): Promise<T> {
    return this.patch<T>('/api/preferences', updates)
  }

  public async clearPreferences(): Promise<void> {
    return this.delete<void>('/api/preferences')
  }

  // ─── CFlow ───────────────────────────────────────────────────────────────────

  /**
   * Generate a flow template via AI (form-urlencoded).
   * Returns the raw parsed JSON response.
   */
  public async createFlowTemplate(prompt: string): Promise<unknown> {
    const formData = new URLSearchParams()
    formData.append('input_data', prompt)
    const response = await this.fetchAuthenticated('/cflow/create_flow_template', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })
    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  // ─── IRM Autofill ────────────────────────────────────────────────────────────

  public async autofillInvestmentForm<T = unknown>(formData: FormData): Promise<T> {
    return this.post<T>('/irm/autofill_investment_form', formData)
  }

  // ─── Expense Insights ────────────────────────────────────────────────────────

  public async getExpenseInsights(expenseRequestId: string): Promise<unknown> {
    const formBody = new URLSearchParams()
    formBody.append('expense_request_id', expenseRequestId)
    const response = await this.fetchAuthenticated('/api/expense/expense-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include',
      body: formBody.toString()
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch expense insights: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  // ─── Slide Style (legacy /api/chat endpoint) ──────────────────────────────────

  /**
   * Legacy non-agent chat endpoint used by slide style extraction.
   * Returns raw Response; caller handles JSON parsing.
   */
  public streamSlideStyleChat(form: FormData): Promise<Response> {
    return this.fetchAuthenticated('/api/chat', {
      method: 'POST',
      body: form
    })
  }
}

export const flowbotClient = new FlowbotClient()
