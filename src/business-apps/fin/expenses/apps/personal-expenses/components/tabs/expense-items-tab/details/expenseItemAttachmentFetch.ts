import type { FileClient } from '@/common/network/files/FileClient'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'

export type ExpenseItemFileRecord = NonNullable<ExpenseItem['expenseItemFile']>[number]

export function extractExpenseItemFileId(fileInfo: ExpenseItemFileRecord): string {
  let fileId = fileInfo.id
  if (fileInfo.fileUrl) {
    const urlParts = fileInfo.fileUrl.split('/')
    const potentialFileId = urlParts[urlParts.length - 1]
    if (potentialFileId && potentialFileId !== 'files') {
      fileId = potentialFileId
    }
  }
  return fileId
}

export async function fetchExpenseItemFileBlob(
  fileClient: FileClient,
  fileId: string,
  employeeId: string,
  itemId: string
): Promise<Blob | null> {
  const pathParams = {
    accessScope: 'tenant' as const,
    fileId
  }

  try {
    return await fileClient.getFile(pathParams, {
      appName: 'expenses',
      folderPath: `/expenseItemsDocuments/${employeeId}`
    })
  } catch {
    // Try alternative path
  }

  try {
    return await fileClient.getFile(pathParams, {
      appName: 'expenses',
      folderPath: `employees/${employeeId}/expense-items/${itemId}`
    })
  } catch {
    return null
  }
}
