import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOperationBadge } from './utils/displayUtils'

interface CrmNoteDisplayProps {
  noteId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface CrmNote {
  id: string
  title?: string
  text?: string
  createdAt: string
  authorEmployee?: {
    firstName: string
    lastName: string
  }
}

export const CrmNoteDisplay: React.FC<CrmNoteDisplayProps> = ({ noteId, accessToken, operation }) => {
  const [note, setNote] = useState<CrmNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchNote = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetCrmNote($id: uuid!) {
            CrmNote_by_pk(id: $id) {
              id
              title
              text
              createdAt
              authorEmployee {
                firstName
                lastName
              }
            }
          }
        `

        const result = await graphqlClient.request<{ CrmNote_by_pk: CrmNote }>(query, { id: noteId })

        if (result.CrmNote_by_pk) {
          setNote(result.CrmNote_by_pk)
        } else {
          setError('Note not found')
        }
      } catch (err) {
        console.error('Error fetching note:', err)
        setError('Failed to load note')
      } finally {
        setIsLoading(false)
      }
    }

    if (noteId && accessToken) {
      fetchNote()
    }
  }, [noteId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={note?.title || 'Note'}
      subtitle={
        note?.authorEmployee ? `By ${note.authorEmployee.firstName} ${note.authorEmployee.lastName}` : undefined
      }
      description={note?.text}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        note?.createdAt ? [{ label: 'Created', value: new Date(note.createdAt).toLocaleDateString() }] : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      data-testid="crm-note-display"
    />
  )
}

export default CrmNoteDisplay
