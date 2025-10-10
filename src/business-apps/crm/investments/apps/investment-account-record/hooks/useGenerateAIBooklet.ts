import * as z from 'zod'
import { useState, useCallback } from 'react'
import { InformationExtractionState, UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { ResponseType } from '@/common/network/rest/RestClient'

// Server response schema (Pydantic BaseModel)
const bookletServerSchema = z.object({
  success: z.boolean().describe('Whether the MA Booklet was successfully created'),
  message: z.string().describe('Status message'),
  processed_files: z.array(z.string()).describe('Names of files successfully processed'),
  answered_questions: z.number().describe('Number of questions answered')
})

// UI schema extends server response for AiSummaryButton rendering
const bookletSchema = bookletServerSchema.extend({
  summary: z.string().describe('A concise status summary for display'),
  keyInsights: z.array(z.string()).describe('Details and context for display')
})
type BookletSchema = z.infer<typeof bookletSchema>

export function useGenerateAIBooklet(
  accountId: string,
  accessToken: string,
  options?: {
    outputFileName?: string
    maxQuestions?: number
  }
): UseInformationExtractionReturn<BookletSchema> {
  const [state, setState] = useState<InformationExtractionState<BookletSchema> | null>(null)
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  const restClient = useRestClient(baseUrl)

  const generateSummary = useCallback(async () => {
    setState({ type: 'loading' })

    try {
      // Build output filename with a small timestamp before extension
      const baseOutputName = options?.outputFileName || 'ma_booklet_generated.xlsx'
      const tsPad = (n: number) => String(n).padStart(2, '0')
      const now = new Date()
      const ts = `${now.getFullYear()}${tsPad(now.getMonth() + 1)}${tsPad(now.getDate())}_${tsPad(now.getHours())}${tsPad(now.getMinutes())}`
      const dotIndex = baseOutputName.lastIndexOf('.')
      const stampedOutputName =
        dotIndex > 0
          ? `${baseOutputName.slice(0, dotIndex)}_${ts}${baseOutputName.slice(dotIndex)}`
          : `${baseOutputName}_${ts}`

      const payload = {
        account_id: accountId,
        output_file_name: stampedOutputName,
        max_questions: options?.maxQuestions ?? 5
      }

      // Perform POST via shared RestClient; request text and parse manually to preserve tolerant parsing
      let responseJson: any = null
      try {
        const responseText = await restClient.post<string>('/flowbot/irm/generate_ma_booklet', payload, {
          responseType: ResponseType.TEXT,
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        })
        try {
          responseJson = JSON.parse(responseText as unknown as string)
        } catch {
          // ignore parse errors, treat as success without extra details
        }
      } catch (e) {
        setState({ type: 'error' })
        return
      }

      const outputName = payload.output_file_name

      // Parse server response; if invalid or missing fields, fall back to defaults for UI
      let serverResp: z.infer<typeof bookletServerSchema> | null = null
      try {
        serverResp = bookletServerSchema.parse(responseJson)
      } catch {
        // ignore invalid shape
      }

      const result: BookletSchema = {
        success: serverResp?.success ?? true,
        message: serverResp?.message ?? 'M&A booklet generation requested successfully.',
        processed_files: serverResp?.processed_files ?? [],
        answered_questions: serverResp?.answered_questions ?? options?.maxQuestions ?? 5,
        summary: serverResp?.message ?? `M&A booklet generation requested successfully.`,
        keyInsights: [
          `Generate output file: ${outputName}`,
          ...(Array.isArray(serverResp?.processed_files) && serverResp.processed_files.length > 0
            ? [`Processed files: ${serverResp.processed_files.join(', ')}`]
            : []),
          ...(typeof serverResp?.answered_questions === 'number'
            ? [`Answered questions: ${serverResp.answered_questions}`]
            : [])
        ]
      }

      setState({ type: 'success', content: result })
    } catch (e) {
      setState({ type: 'error' })
    }
  }, [accessToken, accountId, options?.maxQuestions, options?.outputFileName, restClient])

  return { state, generateSummary }
}

export type UseGenerateAIBookletReturn = UseInformationExtractionReturn<BookletSchema>

export default useGenerateAIBooklet
