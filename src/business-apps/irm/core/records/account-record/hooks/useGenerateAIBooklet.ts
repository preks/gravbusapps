import * as z from 'zod'
import { useState, useCallback } from 'react'
import { InformationExtractionState, UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { ResponseType } from '@/common/network/rest/RestClient'

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
    return parsed.toLocaleString()
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
        if (normalizedState === 'completed') return 'M&A booklet generation completed.'
        if (normalizedState === 'failed') return 'M&A booklet generation failed.'
        if (normalizedState === 'running') return 'M&A booklet generation in progress.'
        if (normalizedState === 'queued') return 'M&A booklet generation queued.'
        return `M&A booklet status: ${status.state}.`
      })()

      const summaryMessage = status.error?.trim() || status.message?.trim() || statusMessageFallback

      const keyInsights: string[] = []

      keyInsights.push(`Job ID: ${status.job_id}`)
      if (lastOutputFileName) {
        keyInsights.push(`Output file: ${lastOutputFileName}`)
      }

      if (totalQuestions > 0) {
        keyInsights.push(`Progress: ${processedQuestions} / ${totalQuestions} questions processed`)
      } else {
        keyInsights.push(`Processed questions: ${processedQuestions}`)
      }

      if (status.current_question) {
        keyInsights.push(`Current focus: ${status.current_question}`)
      }

      if (status.processed_files && status.processed_files.length > 0) {
        keyInsights.push(`Processed files: ${status.processed_files.join(', ')}`)
      }

      const formattedUpdatedAt = formatTimestamp(status.updated_at)
      if (formattedUpdatedAt) {
        keyInsights.push(`Last update: ${formattedUpdatedAt}`)
      }

      if (status.output_document_id) {
        keyInsights.push(`Document ID: ${status.output_document_id}`)
      }

      if (status.error) {
        keyInsights.push(`Error: ${status.error}`)
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
      } catch {
        // ignore parse errors, treat as success without extra details
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

    const result: BookletSchema = {
      success: serverResp?.success ?? true,
      message: serverResp?.message ?? 'M&A booklet generation requested successfully.',
      processed_files: serverResp?.processed_files ?? [],
      answered_questions: serverResp?.answered_questions ?? 0,
      summary: serverResp?.message ?? `M&A booklet generation requested successfully.`,
      keyInsights: [
        `Generate output file: ${outputName}`,
        ...(newJobId ? [`Job ID: ${newJobId}`] : []),
        ...(Array.isArray(serverResp?.processed_files) && serverResp.processed_files.length > 0
          ? [`Processed files: ${serverResp.processed_files.join(', ')}`]
          : []),
        ...(typeof serverResp?.answered_questions === 'number'
          ? [`Answered questions: ${serverResp.answered_questions}`]
          : [])
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
        if (normalizedState === 'completed' || normalizedState === 'failed') {
          setJobId(null)
          await startNewBookletJob()
          return
        }

        setJobId(parsedStatus.job_id)
        const result = buildBookletSummaryFromStatus(parsedStatus)
        setState({ type: 'success', content: result })
      } catch {
        setState({ type: 'error' })
      }
    },
    [accessToken, buildBookletSummaryFromStatus, restClient, startNewBookletJob]
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
