import * as z from 'zod'
import { useState, useCallback } from 'react'
import { InformationExtractionState, UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { ResponseType } from '@/common/network/rest/RestClient'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

// Server response schema (Pydantic BaseModel)
const bookletServerSchema = z.object({
  success: z.boolean().optional().describe('Whether the MA Booklet was successfully created'),
  message: z.string().optional().describe('Status message'),
  processed_files: z.array(z.string()).optional().describe('Names of files successfully processed'),
  answered_questions: z.number().optional().describe('Number of questions answered'),
  job_id: z.string().optional().describe('Identifier of the async booklet generation job')
})

// UI schema extends server response for AiSummaryButton rendering
const bookletSchema = bookletServerSchema.extend({
  summary: z.string().describe('A concise status summary for display'),
  keyInsights: z.array(z.string()).describe('Details and context for display')
})
type BookletSchema = z.infer<typeof bookletSchema>

const bookletStatusSchema = z.object({
  job_id: z.string().describe('Identifier of the async booklet generation job'),
  state: z.string().describe('Current status of the job'),
  created_at: z.string().optional().describe('Job creation timestamp'),
  updated_at: z.string().optional().describe('Most recent status update timestamp'),
  total_questions: z.number().optional().nullable().describe('Total questions planned for processing'),
  processed_questions: z.number().optional().nullable().describe('Questions processed so far'),
  current_question: z.string().optional().nullable().describe('Current question being processed'),
  message: z.string().optional().nullable().describe('Human readable status message'),
  processed_files: z.array(z.string()).optional().describe('Files already processed'),
  output_document_id: z.string().optional().nullable().describe('Identifier of the generated document'),
  error: z.string().optional().nullable().describe('Error message, if any')
})
type BookletStatusSchema = z.infer<typeof bookletStatusSchema>

export function useGenerateAIBooklet(
  accountId: string,
  accessToken: string,
  options?: {
    outputFileName?: string
    maxQuestions?: number
  }
): UseInformationExtractionReturn<BookletSchema> {
  const [state, setState] = useState<InformationExtractionState<BookletSchema> | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [lastOutputFileName, setLastOutputFileName] = useState<string | null>(null)
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  const restClient = useRestClient(baseUrl)

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return formatDate(parsed, 'dateTime.short') ?? parsed.toISOString()
  }, [])

  const buildBookletSummaryFromStatus = useCallback(
    (status: BookletStatusSchema): BookletSchema => {
      const processedQuestions = typeof status.processed_questions === 'number' ? status.processed_questions : 0
      const totalQuestionsFallback = options?.maxQuestions ?? 0
      const totalQuestions =
        typeof status.total_questions === 'number' && status.total_questions > 0
          ? status.total_questions
          : totalQuestionsFallback

      const normalizedState = status.state.toLowerCase()

      const statusMessageFallback = (() => {
        if (normalizedState === 'completed')
          return getTranslationFromI18nKeyAndLabel('irm:booklet.status.completed', 'M&A booklet generation completed.')
        if (normalizedState === 'failed')
          return getTranslationFromI18nKeyAndLabel('irm:booklet.status.failed', 'M&A booklet generation failed.')
        if (normalizedState === 'running')
          return getTranslationFromI18nKeyAndLabel('irm:booklet.status.running', 'M&A booklet generation in progress.')
        if (normalizedState === 'queued')
          return getTranslationFromI18nKeyAndLabel('irm:booklet.status.queued', 'M&A booklet generation queued.')
        return getTranslationFromI18nKeyAndLabel('irm:booklet.status.generic', 'M&A booklet status: {{state}}.', {
          state: status.state
        })
      })()

      const summaryMessage = status.error?.trim() || status.message?.trim() || statusMessageFallback

      const keyInsights: string[] = []

      keyInsights.push(
        getTranslationFromI18nKeyAndLabel('irm:booklet.insight.job_id', 'Job ID: {{id}}', { id: status.job_id })
      )
      if (lastOutputFileName) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.output_file', 'Generate output file: {{fileName}}', {
            fileName: lastOutputFileName
          })
        )
      }

      if (totalQuestions > 0) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel(
            'irm:booklet.insight.progress',
            'Progress: {{processed}} / {{total}} questions processed',
            { processed: processedQuestions, total: totalQuestions }
          )
        )
      } else {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel(
            'irm:booklet.insight.processed_only',
            'Processed questions: {{processed}}',
            { processed: processedQuestions }
          )
        )
      }

      if (status.current_question) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.current_question', 'Current focus: {{question}}', {
            question: status.current_question
          })
        )
      }

      if (status.processed_files && status.processed_files.length > 0) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.processed_files', 'Processed files: {{files}}', {
            files: status.processed_files.join(', ')
          })
        )
      }

      const formattedUpdatedAt = formatTimestamp(status.updated_at)
      if (formattedUpdatedAt) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.last_update', 'Last update: {{dateTime}}', {
            dateTime: formattedUpdatedAt
          })
        )
      }

      if (status.output_document_id) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.document_id', 'Document ID: {{id}}', {
            id: status.output_document_id
          })
        )
      }

      if (status.error) {
        keyInsights.push(
          getTranslationFromI18nKeyAndLabel('irm:booklet.insight.error', 'Error: {{message}}', {
            message: status.error
          })
        )
      }

      const result: BookletSchema = {
        success: normalizedState === 'completed',
        message: summaryMessage,
        processed_files: status.processed_files ?? [],
        answered_questions: processedQuestions,
        summary: summaryMessage,
        keyInsights,
        job_id: status.job_id
      }

      return bookletSchema.parse(result)
    },
    [formatTimestamp, lastOutputFileName, options?.maxQuestions]
  )

  const startNewBookletJob = useCallback(async () => {
    // Build output filename with a small timestamp before extension
    const baseOutputName = options?.outputFileName || 'ma_booklet_generated.xlsx'
    const tsPad = (n: number) => String(n).padStart(2, '0')
    const now = new Date()
    const ts = `${now.getFullYear()}${tsPad(now.getMonth() + 1)}${tsPad(now.getDate())}_${tsPad(now.getHours())}${tsPad(
      now.getMinutes()
    )}`
    const dotIndex = baseOutputName.lastIndexOf('.')
    const stampedOutputName =
      dotIndex > 0
        ? `${baseOutputName.slice(0, dotIndex)}_${ts}${baseOutputName.slice(dotIndex)}`
        : `${baseOutputName}_${ts}`

    setLastOutputFileName(stampedOutputName)

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
      } catch (parseError) {
        console.error('Failed to parse /flowbot/irm/generate_ma_booklet response JSON', parseError)
      }
    } catch {
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

    const fallbackJobId = typeof serverResp?.job_id === 'string' ? serverResp.job_id : null
    const newJobId = typeof responseJson?.job_id === 'string' ? responseJson.job_id : fallbackJobId
    setJobId(newJobId ?? null)

    const requestedMessage = getTranslationFromI18nKeyAndLabel(
      'irm:booklet.generation.requested',
      'M&A booklet generation requested successfully.'
    )

    const processedFiles = serverResp?.processed_files ?? []
    const answeredQuestions = typeof serverResp?.answered_questions === 'number' ? serverResp.answered_questions : 0

    const result: BookletSchema = {
      success: serverResp?.success ?? true,
      message: serverResp?.message ?? requestedMessage,
      processed_files: processedFiles,
      answered_questions: answeredQuestions,
      summary: serverResp?.message ?? requestedMessage,
      keyInsights: [
        getTranslationFromI18nKeyAndLabel('irm:booklet.insight.output_file', 'Generate output file: {{fileName}}', {
          fileName: outputName
        }),
        ...(newJobId
          ? [
              getTranslationFromI18nKeyAndLabel('irm:booklet.insight.job_id', 'Job ID: {{id}}', {
                id: newJobId
              })
            ]
          : []),
        ...(processedFiles.length > 0
          ? [
              getTranslationFromI18nKeyAndLabel('irm:booklet.insight.processed_files', 'Processed files: {{files}}', {
                files: processedFiles.join(', ')
              })
            ]
          : []),
        getTranslationFromI18nKeyAndLabel('irm:booklet.insight.answered_questions', 'Answered questions: {{count}}', {
          count: answeredQuestions
        })
      ],
      job_id: newJobId ?? undefined
    }

    setState({ type: 'success', content: bookletSchema.parse(result) })
  }, [accountId, accessToken, options?.maxQuestions, options?.outputFileName, restClient])

  const checkExistingJobStatus = useCallback(
    async (existingJobId: string) => {
      try {
        const statusResponse = await restClient.get(`/flowbot/irm/ma_booklet_status/${existingJobId}`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          responseType: ResponseType.JSON
        })

        const parsedStatus = bookletStatusSchema.parse(statusResponse)

        const normalizedState = parsedStatus.state.toLowerCase()
        const result = buildBookletSummaryFromStatus(parsedStatus)

        if (normalizedState === 'completed' || normalizedState === 'failed') {
          setJobId(null)
          setState({ type: 'success', content: result })
          return
        }

        setJobId(parsedStatus.job_id)
        setState({ type: 'success', content: result })
      } catch {
        setState({ type: 'error' })
      }
    },
    [accessToken, buildBookletSummaryFromStatus, restClient]
  )

  const generateSummary = useCallback(async () => {
    setState({ type: 'loading' })

    try {
      if (jobId) {
        await checkExistingJobStatus(jobId)
        return
      }

      await startNewBookletJob()
    } catch {
      setState({ type: 'error' })
    }
  }, [checkExistingJobStatus, jobId, startNewBookletJob])

  return { state, generateSummary }
}

export type UseGenerateAIBookletReturn = UseInformationExtractionReturn<BookletSchema>

export default useGenerateAIBooklet
