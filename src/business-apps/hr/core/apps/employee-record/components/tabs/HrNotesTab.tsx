import React, { useState, useEffect } from 'react'
import { NoteItem } from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import {
  Button,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { PlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useGetEmployeeNotes } from '../../queries/EmployeeNoteQueries'
import type { EmployeeNoteData } from '../../queries/EmployeeNoteQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import { useEmployeeNoteApi } from '../../hooks/useEmployeeNoteApi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const t = thumb.trim()
  if (!t) return undefined
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('data:image')) return t
  const sig = t.slice(0, 12)
  let mime = 'image/jpeg'
  if (sig.startsWith('iVBORw0KGgo')) mime = 'image/png'
  else if (sig.startsWith('R0lGOD')) mime = 'image/gif'
  else if (sig.startsWith('Qk')) mime = 'image/bmp'
  return `data:${mime};base64,${t}`
}

interface HrNotesTabProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
}

export const HrNotesTab: React.FC<HrNotesTabProps> = props => {
  const { employeeId, employeeName } = props
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null)

  const { fetchEmployeeNotes } = useGetEmployeeNotes(props)
  const { deleteEmployeeNote } = useEmployeeNoteApi(props)

  const loadNotes = React.useCallback(async () => {
    if (!employeeId) return

    setLoading(true)
    try {
      const result = await fetchEmployeeNotes({ employeeId })
      const employeesMap = new Map((result.Employee || []).map(emp => [emp.userId || emp.id, emp]))

      const transformedNotes: NoteItem[] = (result.EmployeeNote || []).map((note: EmployeeNoteData) => {
        const creatorEmployee = employeesMap.get(note.createdBy)
        const creatorName = creatorEmployee
          ? `${creatorEmployee.firstName || ''} ${creatorEmployee.lastName || ''}`.trim() ||
            creatorEmployee.displayName ||
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.unknown', 'Unknown')
          : note.createdBy || getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.unknown', 'Unknown')

        return {
          id: note.id,
          noteTitle:
            note.notes?.substring(0, 50) ||
            getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.employee_note', 'Employee Note'),
          noteText: note.notes || '',
          createdAt: note.createdAt,
          createdBy: creatorName,
          createdByUserId: note.createdBy,
          version: note.version
        }
      })

      setNotes(transformedNotes)
      setEmployees(result.Employee || [])
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }, [employeeId, fetchEmployeeNotes])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  useProcessCompletion({
    onSuccess: () => {
      void loadNotes()
    }
  })

  const filteredNotes = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return notes
    }

    const searchTerm = searchQuery.toLowerCase().trim()
    return notes.filter(note => {
      const noteText = (note.noteText || '').toLowerCase()
      const createdBy = (note.createdBy || '').toLowerCase()
      const createdAt = formatDate(note.createdAt, 'date.short')?.toLowerCase() || ''

      return noteText.includes(searchTerm) || createdBy.includes(searchTerm) || createdAt.includes(searchTerm)
    })
  }, [notes, searchQuery])

  const renderNotesContent = React.useMemo(() => {
    if (filteredNotes.length > 0) {
      return (
        <div className="gba:space-y-3">
          {filteredNotes.map(note => {
            const noteAuthor = employees?.find((emp: any) => emp.userId === (note as any).createdByUserId)
            const authorName =
              note.createdBy || getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.unknown', 'Unknown')
            const authorAvatar = noteAuthor?.pictureThumbnail || null
            const authorInitials = `${noteAuthor?.firstName?.[0] || ''}${noteAuthor?.lastName?.[0] || ''}`.trim()

            return (
              <div
                key={note.id}
                className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-4 gba:space-y-2"
                data-testid={`hr-note-card-${note.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1">
                    <div className="gba:shrink-0 gba:mt-1" data-testid="note-avatar-container">
                      <Avatar className="gba:h-10 gba:w-10">
                        {toAvatarSrc(authorAvatar) && <AvatarImage src={toAvatarSrc(authorAvatar)} alt={authorName} />}
                        <AvatarFallback>{authorInitials}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:mb-3">
                        <h4 className="gba:font-semibold gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.note_from', 'Note from')} {authorName}{' '}
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.note_on', 'on')}{' '}
                          {formatDate(note.createdAt, 'date.short') || ''}
                        </h4>
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground">{note.noteText}</p>
                    </div>
                  </div>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const noteVersion = (note as any).version !== undefined ? (note as any).version : 0
                        startProcess({
                          processName: 'createEmployeeNote',
                          domain: 'employee',
                          payload: {
                            employeeId: employeeId,
                            noteId: note.id,
                            notes: note.noteText,
                            version: noteVersion
                          },
                          builderType: 'NATIVE_SCREEN'
                        })
                      }}
                      data-testid={`hr-note-edit-${note.id}`}
                    >
                      <PencilSimpleIcon className="gba:h-[18px] gba:w-[18px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`hr-note-delete-${note.id}`}
                      disabled={deletingNoteId === note.id}
                      onClick={() => {
                        setNoteToDelete(note)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <TrashIcon className="gba:h-[18px] gba:w-[18px]" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (searchQuery.trim()) {
      return (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          <p>
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.no_notes_found', 'No notes found matching')} &quot;
            {searchQuery}&quot;.
          </p>
        </div>
      )
    }

    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        <p>
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.no_notes_yet', 'No notes yet. Create your first note.')}
        </p>
      </div>
    )
  }, [filteredNotes, searchQuery, deletingNoteId, employeeId])

  return (
    <div data-testid="hr-notes-tab-container" className="gba:space-y-6">
      <div className="gba:flex gba:items-start gba:justify-between">
        <div className="gba:space-y-2">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.tab_name', 'HR Notes')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_notes.description',
              'Manage notes and track interactions with'
            )}{' '}
            {employeeName}
          </p>
        </div>
        <div className="gba:flex gba:gap-3">
          <AppActionMenu
            data-testid="add-note-button"
            contextsArray={[FlowContextName.createEmployeeNote]}
            externalContextData={{
              employeeId: employeeId
            }}
            prefixDataTestId="add-note"
            accessToken={props.accessToken}
            autoExecuteSingleAction={true}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:text-foreground gba:hover:text-foreground/80 gba:font-normal gba:text-base">
              <PlusIcon className="gba:h-5 gba:w-5 gba:text-foreground" />
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.add_note', 'Add Note')}
            </div>
          </AppActionMenu>
        </div>
      </div>

      <div className="gba:border gba:border-border gba:rounded-lg gba:p-3 gba:bg-card">
        <div className="gba:relative">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:pointer-events-none gba:z-10 gba:h-5 gba:w-5" />
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.search_placeholder', 'Search notes...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:!pl-10"
            data-testid="hr-notes-search-input"
          />
        </div>
      </div>

      <div className="gba:space-y-4 gba:border gba:border-border gba:rounded-lg gba:p-4 gba:bg-card">
        <h3 className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.notes_section', 'Notes')}
        </h3>
        {renderNotesContent}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-note-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="delete-note-dialog-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.delete_note_title', 'Delete Note')}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="delete-note-dialog-description">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_notes.delete_note_description',
                'Are you sure you want to delete this note? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setNoteToDelete(null)
              }}
              data-testid="delete-note-dialog-cancel"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!noteToDelete) return

                const noteVersion = (noteToDelete as any).version !== undefined ? (noteToDelete as any).version : 0
                setDeletingNoteId(noteToDelete.id)

                try {
                  await deleteEmployeeNote({
                    employeeNote: {
                      id: noteToDelete.id,
                      version: noteVersion,
                      notes: noteToDelete.noteText,
                      employee: employeeId
                    }
                  })
                  setDeleteDialogOpen(false)
                  setNoteToDelete(null)
                  loadNotes()
                } catch (error) {
                  console.error('Error deleting note:', error)
                  alert(
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_notes.delete_error',
                      'Failed to delete note. Please try again.'
                    )
                  )
                } finally {
                  setDeletingNoteId(null)
                }
              }}
              disabled={deletingNoteId !== null}
              className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90"
              data-testid="delete-note-dialog-confirm"
            >
              {deletingNoteId
                ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.deleting', 'Deleting...')
                : getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HrNotesTab
