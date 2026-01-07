import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGetInvestmentNoteById } from '@/common/data/investment/hooks/useInvestmentNotes'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface NoteDeletePopupValues {
  noteId: string
}

export interface NoteDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<NoteDeletePopupValues>
}

interface NoteData {
  id: string
  version: number
  title?: string
  text?: string
  reminderDate?: string
  authorDisplayName?: string
  authorEmployee?: {
    id: string
    displayName?: string
  }
}

const prefixDataTestId = 'note-delete-popup'

const NoteDeletePopup: React.FC<NoteDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [note, setNote] = useState<NoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { fetchInvestmentNoteById } = useGetInvestmentNoteById(props)

  const noteId =
    props.additionalData?.noteId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.noteId ||
    props.additionalData?.id ||
    initialValues?.noteId ||
    ''

  useEffect(() => {
    const loadNote = async () => {
      if (!noteId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel('note.delete.error.noId', 'Note ID not provided or access token missing')
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await fetchInvestmentNoteById(noteId)

        if (!result?.note) {
          setError(getTranslationFromI18nKeyAndLabel('note.delete.error.notFound', 'Note not found'))
          return
        }

        const nt = result.note

        setNote({
          id: nt.id,
          version: nt.version || 0,
          title: nt.title,
          text: nt.text,
          reminderDate: nt.reminderDate,
          authorDisplayName: nt.authorDisplayName,
          authorEmployee: nt.authorEmployee
        })
      } catch (err) {
        console.error('Failed to load note:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('note.delete.error.loadFailed', 'Failed to load note')
        )
      } finally {
        setLoading(false)
      }
    }

    loadNote()
  }, [noteId, props.accessToken, fetchInvestmentNoteById])

  const handleSubmit = async () => {
    if (!note) {
      throw new Error(getTranslationFromI18nKeyAndLabel('note.delete.error.noData', 'Note data not loaded'))
    }

    const deletePayload = {
      investmentNote: {
        id: note.id,
        version: note.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!note) {
      return [getTranslationFromI18nKeyAndLabel('note.delete.error.noData', 'Note data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner
          size="lg"
          className="gba:mx-auto gba:mb-4"
          data-testid={formatDataTestId(prefixDataTestId, 'loading-spinner')}
        />
        <p>{getTranslationFromI18nKeyAndLabel('note.delete.loading', 'Loading note...')}</p>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('note.delete.error.failed', 'Failed to load note')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ noteId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel('note.delete.title', 'Delete Note')}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">
                {getTranslationFromI18nKeyAndLabel(
                  'note.delete.confirmation.question',
                  'Are you sure you want to delete this note?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                {note.title && (
                  <p>
                    <strong>{getTranslationFromI18nKeyAndLabel('common.title', 'Title')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {note.title}
                    </Badge>
                  </p>
                )}
                {note.text && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.text', 'Text')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {note.text.length > 80 ? `${note.text.substring(0, 80)}...` : note.text}
                    </Badge>
                  </p>
                )}
                {note.authorDisplayName && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('note.author', 'Author')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {note.authorDisplayName}
                    </Badge>
                  </p>
                )}
                {note.reminderDate && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('note.reminderDate', 'Reminder Date')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {new Date(note.reminderDate).toLocaleDateString()}
                    </Badge>
                  </p>
                )}
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default NoteDeletePopup
export { NoteDeletePopup }
