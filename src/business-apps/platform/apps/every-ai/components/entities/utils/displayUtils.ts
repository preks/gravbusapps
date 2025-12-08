export type OperationType = 'create' | 'update' | 'delete' | 'read'

export interface OperationBadge {
  text: string
  variant: 'success' | 'default' | 'destructive'
}

/**
 * Get operation badge configuration for entity display cards
 * @param operation - The operation type (create, update, delete, read)
 * @returns Badge configuration or undefined if no operation
 */
export const getOperationBadge = (operation?: OperationType): OperationBadge | undefined => {
  switch (operation) {
    case 'create':
      return { text: 'Created', variant: 'success' }
    case 'update':
      return { text: 'Updated', variant: 'default' }
    case 'delete':
      return { text: 'Deleted', variant: 'destructive' }
    default:
      return undefined
  }
}
