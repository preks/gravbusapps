import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOperationBadge } from './utils/displayUtils'

interface IrmNoteDisplayProps {
  noteId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface IrmNote {
  id: string
  title: string
  text: string
  reminderDate?: string
  account?: { name: string }
  opportunity?: { name: string }
}

export const IrmNoteDisplay: React.FC<IrmNoteDisplayProps> = ({ noteId, accessToken, operation }) => {
  const [note, setNote] = useState<IrmNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchNote = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetIrmNote($id: uuid!) {
            investmentNotes_by_pk(id: $id) {
              id
              title
              text
              reminderDate
              account {
                name
              }
              opportunity {
                name
              }
            }
          }
        `

        const result = await graphqlClient.request<{ investmentNotes_by_pk: IrmNote }>(query, { id: noteId })

        if (result.investmentNotes_by_pk) {
          setNote(result.investmentNotes_by_pk)
        } else {
          setError('IRM Note not found')
        }
      } catch (err) {
        console.error('Error fetching IRM note:', err)
        setError('Failed to load IRM note')
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
          <div className="gba:h-32 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <span className="gba:text-destructive">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!note) return null

  return (
    <Card className="gba:w-full gba:rounded-2xl" data-testid="irm-note-display">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <span className="gba:text-lg gba:font-semibold">IRM Note</span>
          {(() => {
            const operationBadge = getOperationBadge(operation)
            return operationBadge ? (
              <span
                className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl ${
                  operationBadge.variant === 'success'
                    ? 'gba:bg-success-secondary gba:text-success'
                    : operationBadge.variant === 'destructive'
                      ? 'gba:bg-destructive-secondary gba:text-destructive'
                      : 'gba:bg-info-secondary gba:text-info'
                }`}
              >
                {operationBadge.text}
              </span>
            ) : null
          })()}
        </div>

        <div className="gba:space-y-3">
          <div>
            <div className="gba:text-muted-foreground gba:text-sm">Title</div>
            <div className="gba:text-foreground gba:text-base gba:font-bold">{note.title || '-'}</div>
          </div>

          <div>
            <div className="gba:text-muted-foreground gba:text-sm">Text</div>
            <div className="gba:text-foreground gba:text-sm">{note.text || '-'}</div>
          </div>

          {note.reminderDate && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Reminder Date</div>
              <div className="gba:text-foreground gba:text-sm">{note.reminderDate}</div>
            </div>
          )}

          {note.account && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Linked Account</div>
              <div className="gba:text-foreground gba:text-sm">{note.account.name}</div>
            </div>
          )}

          {note.opportunity && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Linked Opportunity</div>
              <div className="gba:text-foreground gba:text-sm">{note.opportunity.name}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IrmNoteDisplay
