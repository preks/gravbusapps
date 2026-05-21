export const VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS = 300

export const VALUE_MUTATION_COMMAND_HINTS = [
  'set-range-values',
  'set-range-value',
  'set-value',
  'cell-value',
  'edit',
  'paste',
  'formula',
  'clear-content',
  'clear-value'
]

const SNAPSHOT_WORTHY_COMMAND_HINTS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'font',
  'align',
  'merge',
  'border',
  'wrap',
  'numfmt',
  'format',
  'style',
  'color',
  'background',
  'fill-color',
  'text-color',
  'rotate',
  'indent',
  'freeze',
  'hide',
  'unhide',
  'resize',
  'width',
  'height',
  'zoom'
]

const SNAPSHOT_ONLY_UNSUPPORTED_LIVE_COLLAB_HINTS: string[] = []

/** Navigation / selection COMMANDs must not trigger Univer snapshot saves. */
const COMMAND_SNAPSHOT_EXCLUDE_HINTS = [
  'selection',
  'cursor',
  'scroll',
  'activate',
  'navigation',
  'move-selection',
  'expand-selection'
]

const DIMENSION_SNAPSHOT_EXCLUDE_COMMAND_HINTS = [
  ...VALUE_MUTATION_COMMAND_HINTS,
  ...COMMAND_SNAPSHOT_EXCLUDE_HINTS,
  'set-cell-edit-visible',
  'set-range-values',
  'move-selection'
]

const DIMENSION_SNAPSHOT_LAYOUT_COMMAND_HINTS = [
  'resize',
  'width',
  'height',
  'zoom',
  'autofit',
  'auto-fit',
  'insert-row',
  'insert-rows',
  'insert-column',
  'insert-columns',
  'delete-row',
  'delete-rows',
  'delete-column',
  'delete-columns',
  'remove-row',
  'remove-rows',
  'remove-column',
  'remove-columns',
  'set-row-hidden',
  'set-rows-hidden',
  'set-selected-rows-hidden',
  'set-col-hidden',
  'set-cols-hidden',
  'set-selected-cols-hidden',
  'set-selected-cols-visible',
  'set-col-visible',
  'set-cols-visible',
  'set-selected-rows-visible',
  'set-row-visible',
  'set-rows-visible',
  'set-worksheet-hidden',
  'insert-sheet',
  'remove-sheet',
  'copy-sheet',
  'duplicate-sheet'
]

/**
 * Dimension sync only needs row/column/zoom metadata, but the current reader
 * obtains it through a full workbook snapshot. Run that expensive read only for
 * commands that can plausibly change layout dimensions, never for high-volume
 * typing, value, edit-visibility, or selection movement commands.
 */
export const shouldRunDimensionSnapshotForCommand = (commandId: string, commandType?: number): boolean => {
  void commandType
  const id = commandId.toLowerCase()
  if (!id) return false
  if (DIMENSION_SNAPSHOT_EXCLUDE_COMMAND_HINTS.some(hint => id.includes(hint))) return false
  return DIMENSION_SNAPSHOT_LAYOUT_COMMAND_HINTS.some(hint => id.includes(hint))
}

/**
 * True when the command id looks like formatting/layout only (no cell-value batch).
 * Used to avoid routing style mutations through row/cell HTTP batch (which can clear values).
 */
export const isStyleOnlySheetMutationCommand = (commandId: string): boolean => {
  const id = commandId.toLowerCase()
  if (!id) return false
  if (VALUE_MUTATION_COMMAND_HINTS.some(hint => id.includes(hint))) return false
  return SNAPSHOT_WORTHY_COMMAND_HINTS.some(hint => id.includes(hint))
}

export const isUnsupportedSnapshotOnlyCollaborationCommand = (commandId: string): boolean => {
  const id = commandId.toLowerCase()
  if (!id) return false
  return SNAPSHOT_ONLY_UNSUPPORTED_LIVE_COLLAB_HINTS.some(hint => id.includes(hint))
}

/**
 * Univer commands that wipe BOTH cell values and formatting/style metadata for the
 * selected ranges (the spreadsheet "Clear All" action). Distinct from the narrower
 * `clear-content` (values only) and `clear-format` (style only) commands. We need a
 * dedicated detector because the value-clear pipeline alone does not propagate the
 * style wipe to remote collaborators — they only learn about the values being null.
 */
const CLEAR_ALL_RANGE_COMMAND_HINTS = ['clear-selection-all', 'clear-range-all', 'clear-all']

export const isClearAllRangeCommand = (commandId: string): boolean => {
  const id = commandId.toLowerCase()
  if (!id) return false
  return CLEAR_ALL_RANGE_COMMAND_HINTS.some(hint => id.includes(hint))
}

/**
 * Univer commands that wipe ONLY formatting (style ref + inline `bg`/`cl`/`bd`/…)
 * for the selected ranges, leaving cell values intact. Counterpart to
 * `clear-content` (values only) and `clear-selection-all` (both). Detected
 * separately so we can route to the dedicated `clear_format` collaboration op
 * — the existing `set_style` path silently drops these mutations because the
 * post-mutation cell read returns an empty payload after value-key stripping.
 */
const CLEAR_FORMAT_RANGE_COMMAND_HINTS = ['clear-selection-format', 'clear-range-format', 'clear-format']

export const isClearFormatRangeCommand = (commandId: string): boolean => {
  const id = commandId.toLowerCase()
  if (!id) return false
  return CLEAR_FORMAT_RANGE_COMMAND_HINTS.some(hint => id.includes(hint))
}

export const shouldScheduleSnapshotForMutation = ({
  commandType,
  mutationCommandType,
  commandId,
  params,
  now,
  lastCellValueMutationAt
}: {
  commandType: number | undefined
  mutationCommandType: number
  commandId: string
  params: { cellValue?: unknown } | undefined
  now: number
  lastCellValueMutationAt: number
}): boolean => {
  const normalizedCommandId = commandId.toLowerCase()

  const isLikelyCellValueMutation =
    params?.cellValue != null ||
    VALUE_MUTATION_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint)) ||
    now - lastCellValueMutationAt <= VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS

  // Bold, borders, number format, etc. often arrive as COMMAND (type 0), not MUTATION (type 2).
  if (commandType !== mutationCommandType) {
    if (!normalizedCommandId) return false
    if (COMMAND_SNAPSHOT_EXCLUDE_HINTS.some(hint => normalizedCommandId.includes(hint))) return false
    // COMMAND channel: do not use time-based suppression (user may bold immediately after typing).
    const isValueLikeCommand =
      params?.cellValue != null || VALUE_MUTATION_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint))
    if (isValueLikeCommand) return false
    return SNAPSHOT_WORTHY_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint))
  }

  if (isLikelyCellValueMutation) return false

  if (!normalizedCommandId) return false

  return SNAPSHOT_WORTHY_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint))
}
