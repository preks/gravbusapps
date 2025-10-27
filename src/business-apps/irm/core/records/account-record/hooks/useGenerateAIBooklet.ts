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
  // const baseUrl = 'http://127.0.0.1:8000'
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

      const jobIdLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.job_id', 'Job ID')
      keyInsights.push(`${jobIdLabel}: ${status.job_id}`)
      if (lastOutputFileName) {
        const outputFileLabel = getTranslationFromI18nKeyAndLabel(
          'irm:booklet.label.output_file',
          'Generate output file'
        )
        keyInsights.push(`${outputFileLabel}: ${lastOutputFileName}`)
      }

      if (totalQuestions > 0) {
        const progressLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.progress', 'Progress')
        const questionsProcessedLabel = getTranslationFromI18nKeyAndLabel(
          'irm:booklet.label.questions_processed',
          'questions processed'
        )
        keyInsights.push(`${progressLabel}: ${processedQuestions} / ${totalQuestions} ${questionsProcessedLabel}`)
      } else {
        const processedLabel = getTranslationFromI18nKeyAndLabel(
          'irm:booklet.label.processed_questions',
          'Processed questions'
        )
        keyInsights.push(`${processedLabel}: ${processedQuestions}`)
      }

      if (status.current_question) {
        const currentFocusLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.current_focus', 'Current focus')
        keyInsights.push(`${currentFocusLabel}: ${status.current_question}`)
      }

      if (status.processed_files && status.processed_files.length > 0) {
        const processedFilesLabel = getTranslationFromI18nKeyAndLabel(
          'irm:booklet.label.processed_files',
          'Processed files'
        )
        keyInsights.push(`${processedFilesLabel}: ${status.processed_files.join(', ')}`)
      }

      const formattedUpdatedAt = formatTimestamp(status.updated_at)
      if (formattedUpdatedAt) {
        const lastUpdateLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.last_update', 'Last update')
        keyInsights.push(`${lastUpdateLabel}: ${formattedUpdatedAt}`)
      }

      if (status.output_document_id) {
        const documentIdLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.document_id', 'Document ID')
        keyInsights.push(`${documentIdLabel}: ${status.output_document_id}`)
      }

      if (status.error) {
        const errorLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.error', 'Error')
        keyInsights.push(`${errorLabel}: ${status.error}`)
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

      const parsed = bookletSchema.safeParse(result)
      if (!parsed.success) {
        console.error('Failed to validate booklet status summary', parsed.error)
        return result
      }

      return parsed.data
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

    const processedFiles = Array.isArray(serverResp?.processed_files) ? serverResp.processed_files : []
    const answeredQuestions = typeof serverResp?.answered_questions === 'number' ? serverResp.answered_questions : 0
    const outputFileLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.output_file', 'Generate output file')
    const jobIdLabel = getTranslationFromI18nKeyAndLabel('irm:booklet.label.job_id', 'Job ID')
    const processedFilesLabel = getTranslationFromI18nKeyAndLabel(
      'irm:booklet.label.processed_files',
      'Processed files'
    )
    const answeredQuestionsLabel = getTranslationFromI18nKeyAndLabel(
      'irm:booklet.label.answered_questions',
      'Answered questions'
    )

    const result: BookletSchema = {
      success: serverResp?.success ?? true,
      message: serverResp?.message ?? requestedMessage,
      processed_files: processedFiles,
      answered_questions: answeredQuestions,
      summary: serverResp?.message ?? requestedMessage,
      keyInsights: [
        `${outputFileLabel}: ${outputName}`,
        ...(newJobId ? [`${jobIdLabel}: ${newJobId}`] : []),
        ...(processedFiles.length > 0 ? [`${processedFilesLabel}: ${processedFiles.join(', ')}`] : []),
        `${answeredQuestionsLabel}: ${answeredQuestions}`
      ],
      job_id: newJobId ?? undefined
    }

    setState({ type: 'success', content: { ...result, summary: result.summary ?? requestedMessage } })
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
          setState({
            type: 'success',
            content: {
              ...result,
              job_id: undefined
            }
          })
          return
        }

        setJobId(parsedStatus.job_id)
        setState({ type: 'success', content: result })
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          // Job is no longer available (e.g. server restarted); start a fresh generation run
          setJobId(null)
          await startNewBookletJob()
          return
        }

        setState({ type: 'error' })
      }
    },
    [accessToken, buildBookletSummaryFromStatus, restClient, startNewBookletJob]
  )

  const generateSummary = useCallback(async () => {
    setState({ type: 'loading' })

    const derivedJobId =
      jobId ?? (state?.type === 'success' && state.content?.job_id ? String(state.content.job_id) : null)

    try {
      if (derivedJobId) {
        await checkExistingJobStatus(derivedJobId)
        return
      }

      await startNewBookletJob()
    } catch {
      setState({ type: 'error' })
    }
  }, [checkExistingJobStatus, jobId, startNewBookletJob, state])

  return { state, generateSummary }
}

export type UseGenerateAIBookletReturn = UseInformationExtractionReturn<BookletSchema>

export default useGenerateAIBooklet
