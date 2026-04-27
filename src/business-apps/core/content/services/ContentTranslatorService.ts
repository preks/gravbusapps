import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

interface TranslationApiResponse {
  translations: string[]
  languages: string[]
  confidences: number[]
}

interface TranslationApiRequest {
  texts: string[]
  target_language?: string
}

export interface DetectedContentLanguage {
  languageId: string | null
  confidence: number
}

export class ContentTranslatorService {
  private readonly restClient: RestClient

  constructor(accessToken: string) {
    this.restClient = new RestClient(resolveFlowbotBaseUrl(), {
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    })
  }

  public async detectLanguage(text: string): Promise<DetectedContentLanguage> {
    const trimmedText = text.trim()
    if (!trimmedText) {
      return {
        languageId: null,
        confidence: 0
      }
    }

    const response = await this.translateInternal([trimmedText])

    return {
      languageId: response.languages[0] ?? null,
      confidence: response.confidences[0] ?? 0
    }
  }

  public async translateTexts(inputTexts: string[], targetLanguage: string): Promise<string[]> {
    if (inputTexts.length === 0) {
      return []
    }

    const response = await this.translateInternal(inputTexts, targetLanguage)
    return response.translations
  }

  private async translateInternal(texts: string[], targetLanguage?: string): Promise<TranslationApiResponse> {
    const requestBody: TranslationApiRequest = {
      texts,
      ...(targetLanguage ? { target_language: targetLanguage } : {})
    }

    // TODO: Move these content translation calls back into the shared Flowbot client once its translation API is ready.
    return this.restClient.post<TranslationApiResponse>('/flowbot/translation/translate', requestBody)
  }
}
