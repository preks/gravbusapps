export const MERGE_WORKSHEET_COMMAND_ID = 'sheet.command.add-worksheet-merge'
export const MERGE_WORKSHEET_MUTATION_ID = 'sheet.mutation.add-worksheet-merge'
export const UNMERGE_WORKSHEET_COMMAND_ID = 'sheet.command.remove-worksheet-merge'
export const UNMERGE_WORKSHEET_MUTATION_ID = 'sheet.mutation.remove-worksheet-merge'

export function isWorksheetMergeMutationCommand(commandId: string | null | undefined): boolean {
  return commandId === MERGE_WORKSHEET_MUTATION_ID || commandId === UNMERGE_WORKSHEET_MUTATION_ID
}
