export type ImportProgressDetailValues = Record<string, number | string>

export type PptxImportProgressPhase =
  | 'parsing'
  | 'preparing'
  | 'uploading-images'
  | 'processing-videos'
  | 'saving'
  | 'finalizing'
  | 'completed'

export interface PptxImportProgressState {
  phase: PptxImportProgressPhase
  percent: number
  labelKey: string
  detailKey?: string
  detailValues?: ImportProgressDetailValues
  estimated?: boolean
}

type ProgressRange = { start: number; end: number }

const PHASE_RANGES: Record<Exclude<PptxImportProgressPhase, 'completed'>, ProgressRange> = {
  parsing: { start: 0, end: 50 },
  preparing: { start: 50, end: 50 },
  'uploading-images': { start: 50, end: 70 },
  'processing-videos': { start: 70, end: 85 },
  saving: { start: 85, end: 99 },
  finalizing: { start: 85, end: 99 }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function mapPhasePercent(phase: Exclude<PptxImportProgressPhase, 'completed'>, rawPercent: number): number {
  const range = PHASE_RANGES[phase]
  const normalizedPercent = Math.max(0, Math.min(100, rawPercent))
  return clampPercent(range.start + ((range.end - range.start) * normalizedPercent) / 100)
}

function buildProgressState(
  phase: Exclude<PptxImportProgressPhase, 'completed'>,
  rawPercent: number,
  labelKey: string,
  options: {
    detailKey?: string
    detailValues?: ImportProgressDetailValues
    estimated?: boolean
  } = {}
): PptxImportProgressState {
  return {
    phase,
    percent: mapPhasePercent(phase, rawPercent),
    labelKey,
    detailKey: options.detailKey,
    detailValues: options.detailValues,
    estimated: options.estimated
  }
}

function toRatioPercent(current: number, total: number): number {
  if (total <= 0) return 100
  return (current / total) * 100
}

export function createPreparingImportProgress(): PptxImportProgressState {
  return buildProgressState('preparing', 0, 'import-progress-phase-preparing', {
    detailKey: 'import-progress-detail-preparing'
  })
}

export function createParsingImportProgress(parserPercent: number): PptxImportProgressState {
  return buildProgressState('parsing', parserPercent, 'import-progress-phase-parsing', {
    detailKey: 'import-progress-detail-parsing'
  })
}

export function createImageUploadImportProgress(uploaded: number, total: number): PptxImportProgressState {
  return buildProgressState(
    'uploading-images',
    toRatioPercent(uploaded, total),
    'import-progress-phase-uploading-images',
    {
      detailKey: 'import-progress-detail-images',
      detailValues: { current: uploaded, total }
    }
  )
}

export function createVideoProcessingImportProgress(processed: number, total: number): PptxImportProgressState {
  return buildProgressState(
    'processing-videos',
    toRatioPercent(processed, total),
    'import-progress-phase-processing-videos',
    {
      detailKey: 'import-progress-detail-videos',
      detailValues: { current: processed, total }
    }
  )
}

export function createSavingImportProgress(jobPercent: number): PptxImportProgressState {
  const roundedPercent = clampPercent(jobPercent)
  return buildProgressState('saving', roundedPercent, 'import-progress-phase-saving', {
    detailKey: 'import-progress-detail-saving',
    detailValues: { progress: roundedPercent }
  })
}

export function createFinalizingImportProgress(rawPercent = 0, estimated = true): PptxImportProgressState {
  return buildProgressState('finalizing', rawPercent, 'import-progress-phase-finalizing', {
    detailKey: estimated ? 'import-progress-detail-finalizing-estimated' : 'import-progress-detail-finalizing',
    estimated
  })
}

export function createCompletedImportProgress(): PptxImportProgressState {
  return {
    phase: 'completed',
    percent: 100,
    labelKey: 'import-progress-phase-completed',
    detailKey: 'import-progress-detail-completed'
  }
}

export function ensureMonotonicImportProgress(
  nextProgress: PptxImportProgressState,
  previousProgress: PptxImportProgressState | null
): PptxImportProgressState {
  if (!previousProgress || nextProgress.percent >= previousProgress.percent) return nextProgress
  return { ...nextProgress, percent: previousProgress.percent }
}
