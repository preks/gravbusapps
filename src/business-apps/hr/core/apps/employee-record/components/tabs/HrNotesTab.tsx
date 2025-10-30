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
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { PiChatCircle } from 'react-icons/pi'
import { useGetEmployeeNotes } from '../../queries/EmployeeNoteQueries'
import type { EmployeeNoteData } from '../../queries/EmployeeNoteQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import { useEmployeeNoteApi } from '../../hooks/useEmployeeNoteApi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

interface HrNotesTabProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
}

export const HrNotesTab: React.FC<HrNotesTabProps> = props => {
  const { employeeId, employeeName } = props
  const [notes, setNotes] = useState<NoteItem[]>([])
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
          version: note.version
        }
      })

      setNotes(transformedNotes)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }, [employeeId, fetchEmployeeNotes])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

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

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        const response = event.detail?.response

        if (response?.hrNote || response?.HrNote || response?.employeeNote || response?.EmployeeNote) {
          loadNotes()
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'processCompletion',
      'taskCompletion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [loadNotes])

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
          <Button
            onClick={() => {
              startProcess({
                processName: 'createEmployeeNote',
                domain: 'employee',
                payload: {
                  employeeId: employeeId
                },
                builderType: 'NATIVE_SCREEN'
              })
            }}
            variant="outline"
            data-testid="add-note-button"
          >
            <PlusOutlined className="gba:mr-2" style={{ fontSize: 18 }} />
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.add_note', 'Add Note')}
          </Button>
        </div>
      </div>

      <div className="gba:border gba:border-border gba:rounded-lg gba:p-3 gba:bg-card">
        <div className="gba:relative">
          <SearchOutlined
            className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:pointer-events-none gba:z-10"
            style={{ fontSize: 20 }}
          />
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
        {filteredNotes.length > 0 ? (
          <div className="gba:space-y-3">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-4 gba:space-y-2"
                data-testid={`hr-note-card-${note.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1">
                    <PiChatCircle
                      className="gba:text-muted-foreground gba:mt-1 gba:flex-shrink-0"
                      style={{ fontSize: 24, display: 'block' }}
                    />
                    <div className="gba:flex-1">
                      <div className="gba:mb-3">
                        <h4 className="gba:font-semibold gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.note_from', 'Note from')}{' '}
                          {note.createdBy || getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.unknown', 'Unknown')}{' '}
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
                      <EditOutlined style={{ fontSize: 18 }} />
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
                      <DeleteOutlined style={{ fontSize: 18 }} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            <p>
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.no_notes_found', 'No notes found matching')} &quot;
              {searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            <p>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_notes.no_notes_yet',
                'No notes yet. Create your first note.'
              )}
            </p>
          </div>
        )}
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
