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
  action:
    | 'improve_description'
    | 'summarize'
    | 'improve_writing'
    | 'fix_spelling_grammar'
    | 'make_shorter'
    | 'change_tone'
    | 'translate'
  tone?: 'professional' | 'empathetic' | 'casual' | 'neutral' | 'educational' | null
  target_language?: string | null
}

export interface TextGenerationResponse {
  generated_texts: string[]
  action: string
}

export class FlowbotClient extends RestClient {
  constructor() {
    // Using the flowbot service URL from the provided endpoint
    const url = 'https://newwork-dev.newwork.com/flowbot'
    super(url, {})
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
    action: TextGenerationRequest['action'],
    options?: {
      tone?: TextGenerationRequest['tone']
      target_language?: string | null
    },
    requestOptions: Omit<RequestOptions, 'body'> = {}
  ): Promise<TextGenerationResponse> {
    const requestBody: TextGenerationRequest = {
      texts,
      action,
      ...(options?.tone !== undefined && { tone: options.tone }),
      ...(options?.target_language !== undefined && { target_language: options.target_language })
    }

    return this.post<TextGenerationResponse>('/text-generation/generate', requestBody, requestOptions)
  }
}

export const flowbotClient = new FlowbotClient()
