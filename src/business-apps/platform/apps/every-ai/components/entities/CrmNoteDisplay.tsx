import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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

  if (isLoading) {
    return (
      <Card className="gba:w-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:h-24 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <p className="gba:text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!note) return null

  return (
    <Card className="gba:w-full gba:rounded-2xl" data-testid="crm-note-display">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <svg className="gba:h-5 gba:w-5 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="gba:text-lg gba:font-semibold">Note</span>
          </div>
          {operation && (
            <span
              className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl gba:capitalize ${
                operation === 'create'
                  ? 'gba:bg-success-secondary gba:text-success'
                  : 'gba:bg-info-secondary gba:text-info'
              }`}
            >
              {operation}
            </span>
          )}
        </div>

        <div className="gba:space-y-3">
          {note.title && (
            <div>
              <div className="gba:text-foreground gba:text-base gba:font-bold">{note.title}</div>
            </div>
          )}

          {note.text && (
            <div>
              <div className="gba:text-foreground gba:text-sm gba:whitespace-pre-wrap">{note.text}</div>
            </div>
          )}

          {note.authorEmployee && (
            <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
              <div className="gba:text-xs gba:text-muted-foreground">
                By {note.authorEmployee.firstName} {note.authorEmployee.lastName}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CrmNoteDisplay
