import type { SpreadsheetSheet } from '../types'
import {
  buildSheetScopedSnapshotRepairArtifact,
  type BootstrapSnapshotLoaderResult
} from '../utils/spreadsheetBootstrapSnapshotHelpers'
import { attachSnapshotCoversVersions, getSheetCoverageVersion } from '../utils/spreadsheetSnapshotCoverage'
import { INLINE_FORMATTING_KEYS } from '../utils/univerAdapter'

export type SheetVisualFormattingSource = 'hydration' | 'cache' | 'remote' | 'session' | 'missing'

export type SheetVisualReadiness = 'data_only' | 'visual_partial' | 'visual_complete'

export type SheetVisualCandidateDiagnostics = {
  hasWorkbookStyleRegistry: boolean
  worksheetStyleRefCount: number
  hasResolvableWorksheetStyleSignal: boolean
  hasWorksheetCellData: boolean
  hasWorksheetStructuralVisualSignal: boolean
  hasOrphanStyleRegistry: boolean
}

export type PreparedSheetVisualCandidate = {
  result: BootstrapSnapshotLoaderResult
  activeSheetIdLocal: string
  formattingSource: SheetVisualFormattingSource
  readiness: SheetVisualReadiness
  canonicalMin: number
  loaderCoverageVersion: number
  rowOverlayChanged: boolean
  formattingEnriched: boolean
  snapshotWithCoverage: Record<string, unknown> | null
  validation: ReturnType<typeof buildSheetScopedSnapshotRepairArtifact>['validation']
}

type PrepareSheetVisualCandidateParams = {
  preferUniverNativeSheetTabs: boolean
  candidate: BootstrapSnapshotLoaderResult
  canonicalSheetMeta: SpreadsheetSheet
  canonicalRows: Record<string, unknown>[]
  appId: string
  activeSheetId: string
  appSheets?: SpreadsheetSheet[]
  formattingSourceOverride?: SheetVisualFormattingSource
}

export const getSheetVisualSafetyRank = (safety: 'unsafe' | 'repairable' | 'safe'): number => {
  if (safety === 'safe') return 2
  if (safety === 'repairable') return 1
  return 0
}

export const getSheetVisualReadinessRank = (readiness: SheetVisualReadiness): number => {
  if (readiness === 'visual_complete') return 2
  if (readiness === 'visual_partial') return 1
  return 0
}

const getWorksheetSnapshot = (
  snapshot: Record<string, unknown> | null,
  sheetId: string
): Record<string, unknown> | null => {
  if (!snapshot || typeof snapshot !== 'object') return null
  const sheets = snapshot.sheets
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return null
  const worksheet = (sheets as Record<string, unknown>)[sheetId]
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) return null
  return worksheet as Record<string, unknown>
}

const countWorksheetStyleReferences = (worksheet: Record<string, unknown> | null): number => {
  if (!worksheet) return 0
  const cellData = worksheet.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return 0
  let styleRefCount = 0
  for (const row of Object.values(cellData as Record<string, unknown>)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    for (const cell of Object.values(row as Record<string, unknown>)) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      const styleRef = (cell as Record<string, unknown>).s
      if (
        (typeof styleRef === 'string' && styleRef.trim().length > 0) ||
        (typeof styleRef === 'number' && Number.isFinite(styleRef))
      ) {
        styleRefCount += 1
      }
    }
  }
  return styleRefCount
}

const getStyleRefId = (styleRef: unknown): string | null => {
  if (typeof styleRef === 'string') {
    const normalized = styleRef.trim()
    return normalized.length > 0 ? normalized : null
  }
  if (typeof styleRef === 'number' && Number.isFinite(styleRef)) {
    return String(styleRef)
  }
  return null
}

const cellHasResolvableFormattingSignal = (
  cell: Record<string, unknown>,
  styles: Record<string, unknown> | null
): boolean => {
  const styleRefId = getStyleRefId(cell.s)
  if (
    styleRefId &&
    styles?.[styleRefId] &&
    typeof styles[styleRefId] === 'object' &&
    !Array.isArray(styles[styleRefId])
  ) {
    return true
  }
  if (cell.s && typeof cell.s === 'object' && !Array.isArray(cell.s) && Object.keys(cell.s).length > 0) {
    return true
  }
  return Object.keys(cell).some(key => INLINE_FORMATTING_KEYS.has(key))
}

const hasResolvableWorksheetStyleSignal = (
  worksheet: Record<string, unknown> | null,
  styles: Record<string, unknown> | null
): boolean => {
  if (!worksheet) return false
  const cellData = worksheet.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return false
  for (const row of Object.values(cellData as Record<string, unknown>)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    for (const cell of Object.values(row as Record<string, unknown>)) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      if (cellHasResolvableFormattingSignal(cell as Record<string, unknown>, styles)) {
        return true
      }
    }
  }
  return false
}

const hasWorksheetCellData = (worksheet: Record<string, unknown> | null): boolean => {
  if (!worksheet) return false
  const cellData = worksheet.cellData
  return Boolean(
    cellData && typeof cellData === 'object' && !Array.isArray(cellData) && Object.keys(cellData).length > 0
  )
}

const hasWorksheetStructuralVisualSignal = (worksheet: Record<string, unknown> | null): boolean => {
  if (!worksheet) return false
  const rowData = worksheet.rowData
  if (rowData && typeof rowData === 'object' && !Array.isArray(rowData) && Object.keys(rowData).length > 0) {
    return true
  }
  const columnData = worksheet.columnData
  if (
    columnData &&
    typeof columnData === 'object' &&
    !Array.isArray(columnData) &&
    Object.keys(columnData).length > 0
  ) {
    return true
  }
  const mergeData = worksheet.mergeData
  if (Array.isArray(mergeData) && mergeData.length > 0) {
    return true
  }
  const freeze = worksheet.freeze
  if (freeze && typeof freeze === 'object' && !Array.isArray(freeze)) {
    const xSplit = (freeze as Record<string, unknown>).xSplit
    const ySplit = (freeze as Record<string, unknown>).ySplit
    return Number(xSplit ?? 0) > 0 || Number(ySplit ?? 0) > 0
  }
  return false
}

export const classifyPreparedSheetVisualCandidate = (
  prepared: Pick<
    PreparedSheetVisualCandidate,
    'activeSheetIdLocal' | 'formattingEnriched' | 'rowOverlayChanged' | 'snapshotWithCoverage' | 'validation'
  >
): SheetVisualReadiness => {
  if (!prepared.snapshotWithCoverage || !prepared.validation.valid) {
    return 'data_only'
  }
  const diagnostics = getPreparedSheetVisualCandidateDiagnostics(prepared)

  if (
    prepared.validation.formattingScore > 0 ||
    prepared.formattingEnriched ||
    diagnostics.hasResolvableWorksheetStyleSignal
  ) {
    return 'visual_complete'
  }
  if (diagnostics.hasOrphanStyleRegistry) {
    return diagnostics.hasWorksheetStructuralVisualSignal ? 'visual_partial' : 'data_only'
  }
  if (diagnostics.hasWorksheetCellData && !prepared.rowOverlayChanged) {
    return 'visual_complete'
  }
  if (diagnostics.hasWorksheetStructuralVisualSignal) {
    return 'visual_partial'
  }
  return 'data_only'
}

export const getPreparedSheetVisualCandidateDiagnostics = (
  prepared: Pick<PreparedSheetVisualCandidate, 'activeSheetIdLocal' | 'snapshotWithCoverage' | 'validation'>
): SheetVisualCandidateDiagnostics => {
  if (!prepared.snapshotWithCoverage || !prepared.validation.valid) {
    return {
      hasWorkbookStyleRegistry: false,
      worksheetStyleRefCount: 0,
      hasResolvableWorksheetStyleSignal: false,
      hasWorksheetCellData: false,
      hasWorksheetStructuralVisualSignal: false,
      hasOrphanStyleRegistry: false
    }
  }
  const worksheet = getWorksheetSnapshot(prepared.snapshotWithCoverage, prepared.activeSheetIdLocal)
  const styles = prepared.snapshotWithCoverage.styles
  const workbookStyles =
    styles && typeof styles === 'object' && !Array.isArray(styles) ? (styles as Record<string, unknown>) : null
  const hasWorkbookStyleRegistry = Boolean(
    styles && typeof styles === 'object' && !Array.isArray(styles) && Object.keys(styles).length > 0
  )
  const worksheetStyleRefCount = countWorksheetStyleReferences(worksheet)
  const hasResolvableWorksheetStyleSignalValue = hasResolvableWorksheetStyleSignal(worksheet, workbookStyles)
  const hasWorksheetCellDataValue = hasWorksheetCellData(worksheet)
  const hasWorksheetStructuralVisualSignalValue = hasWorksheetStructuralVisualSignal(worksheet)
  const hasOrphanStyleRegistry =
    hasWorkbookStyleRegistry &&
    !hasResolvableWorksheetStyleSignalValue &&
    worksheetStyleRefCount === 0 &&
    prepared.validation.formattingScore <= 0

  return {
    hasWorkbookStyleRegistry,
    worksheetStyleRefCount,
    hasResolvableWorksheetStyleSignal: hasResolvableWorksheetStyleSignalValue,
    hasWorksheetCellData: hasWorksheetCellDataValue,
    hasWorksheetStructuralVisualSignal: hasWorksheetStructuralVisualSignalValue,
    hasOrphanStyleRegistry
  }
}

export const buildHydrationWorkbookSnapshot = (params: {
  appSheets?: SpreadsheetSheet[]
  canonicalSheetMeta: SpreadsheetSheet
  activeSheetId: string
  operationVersion: number
  sheetSnapshotVersion: number
  workbookSnapshotVersion: number
  worksheetSnapshot: Record<string, unknown> | null | undefined
  workbookDependencies?: Record<string, unknown> | null | undefined
}): Record<string, unknown> | null => {
  const {
    appSheets,
    canonicalSheetMeta,
    activeSheetId,
    operationVersion,
    sheetSnapshotVersion,
    workbookSnapshotVersion,
    worksheetSnapshot,
    workbookDependencies
  } = params
  if (!worksheetSnapshot || typeof worksheetSnapshot !== 'object' || Array.isArray(worksheetSnapshot)) {
    return null
  }
  return attachSnapshotCoversVersions(
    {
      sheetOrder: (appSheets ?? [canonicalSheetMeta]).map(sheet => sheet.id),
      sheets: {
        [activeSheetId]: worksheetSnapshot
      },
      ...(workbookDependencies ?? {}),
      __meta: {
        workbookSnapshotVersion,
        sheetSnapshots: {
          [activeSheetId]: {
            snapshotVersion: sheetSnapshotVersion,
            coversOperationVersion: operationVersion,
            persistedInWorkbookSnapshotVersion: workbookSnapshotVersion
          }
        }
      }
    } as Record<string, unknown>,
    { [activeSheetId]: operationVersion }
  )
}

export const prepareSheetVisualCandidate = (
  params: PrepareSheetVisualCandidateParams
): PreparedSheetVisualCandidate => {
  const {
    preferUniverNativeSheetTabs,
    candidate,
    canonicalSheetMeta,
    canonicalRows,
    appId,
    activeSheetId,
    appSheets,
    formattingSourceOverride
  } = params
  const canonicalMin = Math.max(0, Math.trunc(Number(canonicalSheetMeta.version ?? 0)))
  const currentLoaderCoverageVersion = getSheetCoverageVersion(candidate.coversVersions, activeSheetId)
  const loaderMeetsCanonicalSheet =
    Number.isFinite(canonicalMin) &&
    Number.isFinite(currentLoaderCoverageVersion) &&
    currentLoaderCoverageVersion >= canonicalMin
  const formattingDonorMinWorkbookVersion = loaderMeetsCanonicalSheet ? candidate.version : undefined
  const { snapshotWithCoverage, validation, rowOverlayChanged, formattingEnriched, loaderCoverageVersion } =
    buildSheetScopedSnapshotRepairArtifact({
      preferUniverNativeSheetTabs,
      loaderSnapshot: candidate.snapshot,
      canonicalSheetMeta,
      canonicalRows,
      appId,
      activeSheetId,
      appSheets,
      formattingDonorMinWorkbookVersion,
      coversVersions: candidate.coversVersions
    })

  const readiness = classifyPreparedSheetVisualCandidate({
    activeSheetIdLocal: activeSheetId,
    formattingEnriched,
    rowOverlayChanged,
    snapshotWithCoverage,
    validation
  })

  return {
    result: candidate,
    activeSheetIdLocal: activeSheetId,
    formattingSource:
      formattingSourceOverride ??
      (candidate.source === 'cache' ? 'cache' : candidate.source === 'remote' ? 'remote' : 'missing'),
    readiness,
    canonicalMin,
    loaderCoverageVersion,
    rowOverlayChanged,
    formattingEnriched,
    snapshotWithCoverage,
    validation
  }
}

export const choosePreferredSheetVisualCandidate = (
  current: PreparedSheetVisualCandidate | null,
  candidate: PreparedSheetVisualCandidate | null
): PreparedSheetVisualCandidate | null => {
  if (!candidate || !candidate.validation.valid) return current
  if (!current || !current.validation.valid) return candidate
  const candidateReadiness = getSheetVisualReadinessRank(candidate.readiness)
  const currentReadiness = getSheetVisualReadinessRank(current.readiness)
  if (candidateReadiness !== currentReadiness) {
    return candidateReadiness > currentReadiness ? candidate : current
  }
  const candidateSafety = getSheetVisualSafetyRank(candidate.validation.safety)
  const currentSafety = getSheetVisualSafetyRank(current.validation.safety)
  if (candidateSafety !== currentSafety) {
    return candidateSafety > currentSafety ? candidate : current
  }
  if (candidate.validation.formattingScore !== current.validation.formattingScore) {
    return candidate.validation.formattingScore > current.validation.formattingScore ? candidate : current
  }
  if (candidate.loaderCoverageVersion !== current.loaderCoverageVersion) {
    return candidate.loaderCoverageVersion > current.loaderCoverageVersion ? candidate : current
  }
  if (candidate.result.version !== current.result.version) {
    return candidate.result.version > current.result.version ? candidate : current
  }
  return current
}

export const chooseStableAppliedSheetVisualCandidate = (
  currentApplied: PreparedSheetVisualCandidate | null,
  nextCandidate: PreparedSheetVisualCandidate | null
): PreparedSheetVisualCandidate | null => {
  if (!currentApplied?.validation.valid) {
    return nextCandidate
  }
  if (!nextCandidate?.validation.valid) {
    return currentApplied
  }
  return choosePreferredSheetVisualCandidate(currentApplied, nextCandidate)
}

export const isWeakSessionVisualCandidate = (candidate: PreparedSheetVisualCandidate | null | undefined): boolean => {
  if (!candidate) return false
  return (
    candidate.formattingSource === 'session' &&
    candidate.readiness !== 'visual_complete' &&
    candidate.validation.formattingScore <= 0 &&
    !candidate.formattingEnriched
  )
}

export const resolveBestSheetVisualCandidate = (params: {
  candidates: BootstrapSnapshotLoaderResult[]
  preferUniverNativeSheetTabs: boolean
  canonicalSheetMeta: SpreadsheetSheet
  canonicalRows: Record<string, unknown>[]
  appId: string
  activeSheetId: string
  appSheets?: SpreadsheetSheet[]
  formattingSourceOverrides?: Partial<Record<BootstrapSnapshotLoaderResult['seed'], SheetVisualFormattingSource>>
}): PreparedSheetVisualCandidate | null => {
  let best: PreparedSheetVisualCandidate | null = null
  for (const candidate of params.candidates) {
    const prepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: params.preferUniverNativeSheetTabs,
      candidate,
      canonicalSheetMeta: params.canonicalSheetMeta,
      canonicalRows: params.canonicalRows,
      appId: params.appId,
      activeSheetId: params.activeSheetId,
      appSheets: params.appSheets,
      formattingSourceOverride: params.formattingSourceOverrides?.[candidate.seed]
    })
    best = choosePreferredSheetVisualCandidate(best, prepared)
  }
  return best
}
