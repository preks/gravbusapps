import React, { useState, useEffect } from 'react'
import { NoteItem } from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import { Button, Input } from '@newwork/nw-design-system'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { PiChatCircle } from 'react-icons/pi'
import { useGetEmployeeNotes } from '../../queries/EmployeeNoteQueries'
import type { EmployeeNoteData } from '../../queries/EmployeeNoteQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'

interface HrNotesTabProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
}

export const HrNotesTab: React.FC<HrNotesTabProps> = props => {
  const { employeeId, employeeName } = props
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const { fetchEmployeeNotes } = useGetEmployeeNotes(props)

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
            'Unknown'
          : note.createdBy || 'Unknown'

        return {
          id: note.id,
          noteTitle: note.notes?.substring(0, 50) || 'Employee Note',
          noteText: note.notes || '',
          createdAt: note.createdAt,
          createdBy: creatorName,
          reminderAt: null,
          documents: [],
          // Store additional data needed for editing
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
      {/* Header Section with Action Buttons */}
      <div className="gba:flex gba:items-start gba:justify-between">
        <div className="gba:space-y-2">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">HR Notes</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            Manage notes and track interactions with {employeeName}
          </p>
        </div>
        {/* Action Buttons */}
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
            Add Note
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
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:!pl-10"
            data-testid="hr-notes-search-input"
          />
        </div>
      </div>

      {/* Notes Section */}
      <div className="gba:space-y-4 gba:border gba:border-border gba:rounded-lg gba:p-4 gba:bg-card">
        <h3 className="gba:text-lg gba:font-semibold">Notes</h3>
        {notes.length > 0 ? (
          <div className="gba:space-y-3">
            {notes.map(note => (
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
                          Notes from {note.createdBy || 'Unknown'} on {new Date(note.createdAt).toLocaleDateString()}
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
                        // Get version from note - it's stored in the NoteItem but TypeScript doesn't know about it
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
                    <Button variant="ghost" size="icon" data-testid={`hr-note-delete-${note.id}`}>
                      <DeleteOutlined style={{ fontSize: 18 }} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            <p>No notes yet. Create your first note.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HrNotesTab
