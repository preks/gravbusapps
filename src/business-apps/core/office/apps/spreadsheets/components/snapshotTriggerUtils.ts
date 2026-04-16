export const VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS = 300

const VALUE_MUTATION_COMMAND_HINTS = [
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
  if (commandType !== mutationCommandType) return false

  const normalizedCommandId = commandId.toLowerCase()

  const isLikelyCellValueMutation =
    params?.cellValue != null ||
    VALUE_MUTATION_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint)) ||
    now - lastCellValueMutationAt <= VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS

  if (isLikelyCellValueMutation) return false

  if (!normalizedCommandId) return false

  return SNAPSHOT_WORTHY_COMMAND_HINTS.some(hint => normalizedCommandId.includes(hint))
}
