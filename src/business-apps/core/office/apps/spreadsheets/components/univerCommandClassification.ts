/**
 * 3a: Exact-id Univer command classification registry.
 *
 * Behavior-affecting paths previously used substring sniffing (`commandId.includes('move-row')`)
 * with negative-keyword excludes (`includes('navigation')`). A future Univer command that
 * happens to satisfy both inclusion and exclusion rules can silently flip behavior. This
 * registry replaces sniffing with exact lookup keyed on canonical Univer command ids.
 *
 * ## How to add a new command
 *
 * Find the canonical id (the literal string Univer passes as `commandId`) and add an entry to
 * {@link UNIVER_COMMAND_KIND_REGISTRY}. The registry is the single source of truth for
 * cell-mutation-affecting classification. If a command does not appear here, callers receive
 * `'other'` and behavior-affecting paths emit `spreadsheet.command_classification.unknown`.
 *
 * ## Migration
 *
 * For one release, the substring-based legacy classifier still runs alongside the registry via
 * {@link compareCommandKindWithLegacy}. Any disagreement emits
 * `spreadsheet.command_classification.legacy_mismatch` so we can spot ids missing from the
 * registry before removing the legacy matcher.
 *
 * Remove `legacyClassifyCommandKindBySubstring` and `compareCommandKindWithLegacy` after one
 * release once telemetry is clean.
 */

export type CommandKind =
  | 'clearLike'
  | 'replaceRangeStyle'
  | 'styleOnly'
  | 'structuralRow'
  | 'structuralColumn'
  | 'navigation'
  | 'other'

// Exact canonical Univer command ids. Keys are case-sensitive; callers should pass the id as
// it arrives from Univer. Add new entries here when integrating new Univer commands.
const UNIVER_COMMAND_KIND_ENTRIES: ReadonlyArray<readonly [string, CommandKind]> = [
  // clearLike — wipes values and/or merges/moves the cell payload
  ['sheet.clear-range', 'clearLike'],
  ['sheet.command.clear-selection-content', 'clearLike'],
  ['sheet.command.clear-selection-value', 'clearLike'],
  ['sheet.command.clear-range-value', 'clearLike'],
  ['sheet.command.delete-selection', 'clearLike'],
  ['DeleteSelectionCommand', 'clearLike'],
  ['sheet.mutation.move-range', 'clearLike'],
  ['sheet.mutation.move-cell', 'clearLike'],
  ['sheet.mutation.move-row', 'clearLike'],
  ['sheet.mutation.move-column', 'clearLike'],
  ['sheet.command.cut-paste', 'clearLike'],

  // replaceRangeStyle — region-replace paste / cut-paste that wipes destination style
  ['sheet.command.paste', 'replaceRangeStyle'],
  ['sheet.command.paste-all', 'replaceRangeStyle'],

  // styleOnly — formatting-only mutations
  ['sheet.command.set-range-bold', 'styleOnly'],
  ['sheet.command.set-range-italic', 'styleOnly'],
  ['sheet.command.set-range-underline', 'styleOnly'],
  ['sheet.command.set-range-strike', 'styleOnly'],
  ['sheet.command.set-range-font', 'styleOnly'],
  ['sheet.command.set-range-fontsize', 'styleOnly'],
  ['sheet.command.set-range-textcolor', 'styleOnly'],
  ['sheet.command.set-range-background', 'styleOnly'],
  ['sheet.command.set-range-border', 'styleOnly'],
  ['sheet.command.set-range-align', 'styleOnly'],
  ['sheet.command.set-range-wrap', 'styleOnly'],
  ['sheet.command.set-range-numfmt', 'styleOnly'],
  ['sheet.command.set-range-format', 'styleOnly'],

  // structuralRow / structuralColumn — sheet-shape changes (out of scope for cell mutations)
  ['sheet.command.insert-row', 'structuralRow'],
  ['sheet.command.insert-rows', 'structuralRow'],
  ['sheet.command.delete-row', 'structuralRow'],
  ['sheet.command.delete-rows', 'structuralRow'],
  ['sheet.command.insert-column', 'structuralColumn'],
  ['sheet.command.insert-columns', 'structuralColumn'],
  ['sheet.command.delete-column', 'structuralColumn'],
  ['sheet.command.delete-columns', 'structuralColumn'],

  // navigation — selection / cursor / scroll, never a cell mutation
  ['sheet.command.move-selection', 'navigation'],
  ['sheet.command.expand-selection', 'navigation'],
  ['sheet.command.scroll', 'navigation'],
  ['sheet.command.cursor', 'navigation']
]

/** Frozen registry; iteration order matches insertion. */
export const UNIVER_COMMAND_KIND_REGISTRY: ReadonlyMap<string, CommandKind> = Object.freeze(
  new Map(UNIVER_COMMAND_KIND_ENTRIES)
) as ReadonlyMap<string, CommandKind>

/**
 * Returns the classification for an exact command id. Unknown ids classify as `'other'` —
 * never guessed. Behavior-affecting callers should also emit the
 * `spreadsheet.command_classification.unknown` telemetry event for `'other'` results.
 */
export function getCommandKind(commandId: string | undefined): CommandKind {
  if (!commandId) return 'other'
  return UNIVER_COMMAND_KIND_REGISTRY.get(commandId) ?? 'other'
}

/**
 * @deprecated 3a: one-release substring classifier kept only so we can spot ids missing from
 * the registry. Remove after telemetry shows no `spreadsheet.command_classification.unknown`
 * or `legacy_mismatch` events for one release.
 */
export function legacyClassifyCommandKindBySubstring(commandId: string | undefined): CommandKind {
  if (!commandId) return 'other'
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return 'other'
  if (
    normalized.includes('navigation') ||
    normalized.includes('move-selection') ||
    normalized.includes('expand-selection') ||
    normalized.includes('scroll') ||
    normalized.includes('cursor')
  ) {
    return 'navigation'
  }
  if (
    normalized.includes('clear-range') ||
    normalized.includes('clear-selection') ||
    normalized.includes('clear-content') ||
    normalized.includes('clear-value') ||
    normalized.includes('delete-selection') ||
    normalized.includes('deleteselectioncommand') ||
    normalized.includes('move-range') ||
    normalized.includes('move-cell') ||
    normalized.includes('move-row') ||
    normalized.includes('move-column') ||
    normalized.includes('cut-paste') ||
    normalized.includes('cutpaste')
  ) {
    return 'clearLike'
  }
  if (normalized.includes('paste') && !normalized.includes('paste-special') && !normalized.includes('pastespecial')) {
    return 'replaceRangeStyle'
  }
  if (
    normalized.includes('bold') ||
    normalized.includes('italic') ||
    normalized.includes('underline') ||
    normalized.includes('strike') ||
    normalized.includes('font') ||
    normalized.includes('align') ||
    normalized.includes('border') ||
    normalized.includes('wrap') ||
    normalized.includes('numfmt') ||
    normalized.includes('format') ||
    normalized.includes('style') ||
    normalized.includes('color') ||
    normalized.includes('background') ||
    normalized.includes('fill-color') ||
    normalized.includes('text-color')
  ) {
    return 'styleOnly'
  }
  if (
    normalized.includes('insert-row') ||
    normalized.includes('insert-rows') ||
    normalized.includes('delete-row') ||
    normalized.includes('delete-rows') ||
    normalized.includes('remove-row') ||
    normalized.includes('remove-rows')
  ) {
    return 'structuralRow'
  }
  if (normalized.includes('insert-col') || normalized.includes('delete-col') || normalized.includes('remove-col')) {
    return 'structuralColumn'
  }
  return 'other'
}

interface CommandKindTelemetryEmitter {
  (
    event: 'spreadsheet.command_classification.unknown' | 'spreadsheet.command_classification.legacy_mismatch',
    payload: {
      commandId: string
      registryKind: CommandKind
      legacyKind: CommandKind
      callerStage?: string
    }
  ): void
}

let telemetryEmitter: CommandKindTelemetryEmitter | null = null

export function setCommandClassificationTelemetryEmitter(emitter: CommandKindTelemetryEmitter | null): void {
  telemetryEmitter = emitter
}

const reportedUnknownIds = new Set<string>()
const reportedMismatchIds = new Set<string>()

/**
 * Reports `unknown` / `legacy_mismatch` once per (commandId, callerStage) pair so behavior-
 * affecting paths can compare the registry decision against the legacy substring classifier
 * during the one-release transition window without flooding telemetry.
 */
export function compareCommandKindWithLegacy(
  commandId: string | undefined,
  callerStage: string
): { registryKind: CommandKind; legacyKind: CommandKind } {
  const registryKind = getCommandKind(commandId)
  const legacyKind = legacyClassifyCommandKindBySubstring(commandId)
  if (registryKind === 'other' && legacyKind !== 'other') {
    const key = `${callerStage}:${commandId ?? ''}`
    if (!reportedUnknownIds.has(key)) {
      reportedUnknownIds.add(key)
      telemetryEmitter?.('spreadsheet.command_classification.unknown', {
        commandId: commandId ?? '',
        registryKind,
        legacyKind,
        callerStage
      })
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[SPREADSHEET_COMMAND_CLASSIFICATION] unknown command id; falling back to legacy classifier', {
          commandId,
          legacyKind,
          callerStage
        })
      }
    }
  } else if (registryKind !== 'other' && registryKind !== legacyKind) {
    const key = `${callerStage}:${commandId ?? ''}`
    if (!reportedMismatchIds.has(key)) {
      reportedMismatchIds.add(key)
      telemetryEmitter?.('spreadsheet.command_classification.legacy_mismatch', {
        commandId: commandId ?? '',
        registryKind,
        legacyKind,
        callerStage
      })
    }
  }
  return { registryKind, legacyKind }
}

/** @internal test helper to reset the one-shot telemetry latches between cases. */
export function __resetCommandClassificationLatchesForTests(): void {
  reportedUnknownIds.clear()
  reportedMismatchIds.clear()
}
