import React, { useState, useEffect } from 'react'
import { NoteItem } from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { PlusIcon, MagnifyingGlass, PencilSimple, Trash, Calendar, User, ChatCircle } from '@phosphor-icons/react'
import { useGetEmployeeNotes } from '../../queries/EmployeeNoteQueries'
import type { EmployeeNoteData } from '../../queries/EmployeeNoteQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import HrNoteModal from './HrNoteModal'

interface HrNotesTabProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
}

export const HrNotesTab: React.FC<HrNotesTabProps> = props => {
  const { accessToken, employeeId, employeeName } = props
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState<{ id: string; notes: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const { fetchEmployeeNotes } = useGetEmployeeNotes(props)

  const loadNotes = React.useCallback(async () => {
    if (!employeeId) return

    setLoading(true)
    try {
      const result = await fetchEmployeeNotes({ employeeId })
      const transformedNotes: NoteItem[] = (result.EmployeeNote || []).map((note: EmployeeNoteData) => ({
        id: note.id,
        noteTitle: note.notes?.substring(0, 50) || 'Employee Note',
        noteText: note.notes || '',
        createdAt: note.createdAt,
        createdBy: note.createdBy,
        reminderAt: null,
        documents: []
      }))

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

        if (response?.hrNote || response?.HrNote) {
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
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">HR Notes & Activities</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            Manage notes and track interactions with {employeeName}
          </p>
        </div>
        {/* Action Buttons */}
        <div className="gba:flex gba:gap-3">
          <Button
            onClick={() => {
              setNoteToEdit(null)
              setIsModalOpen(true)
            }}
            variant="outline"
            data-testid="add-note-button"
          >
            <PlusIcon size={18} weight="duotone" className="gba:mr-2" />
            Add Note
          </Button>
          <Button
            onClick={() => {
              /* TODO: Implement Log Activity */
            }}
            data-testid="logitariactivity-button"
          >
            <PlusIcon size={18} className="gba:mr-2" />
            Log Activity
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="gba:flex gba:gap-3 gba:border gba:border-border gba:rounded-lg gba:p-3 gba:bg-card">
        <div className="gba:flex-1 gba:relative">
          <MagnifyingGlass
            size={20}
            weight="regular"
            className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
            style={{ pointerEvents: 'none', marginTop: '-1px' }}
          />
          <Input
            placeholder="Search notes and activities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
            data-testid="hr-notes-search-input"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="gba:w-[200px]" data-testid="hr-notes-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
          </SelectContent>
        </Select>
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
                    <ChatCircle size={24} className="gba:text-muted-foreground gba:mt-1" />
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <h4 className="gba:font-semibold gba:text-foreground">{note.noteTitle}</h4>
                        {/* Category badge would go here if we had category data */}
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">{note.noteText}</p>
                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <Calendar size={16} />
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        {note.authorEmployee && (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <User size={16} />
                            <span>{note.authorEmployee.displayName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setNoteToEdit({ id: note.id, notes: note.noteText })
                        setIsModalOpen(true)
                      }}
                      data-testid={`hr-note-edit-${note.id}`}
                    >
                      <PencilSimple size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" data-testid={`hr-note-delete-${note.id}`}>
                      <Trash size={18} />
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

      {/* Add/Edit Note Modal */}
      <HrNoteModal
        accessToken={accessToken}
        employeeId={employeeId}
        employeeName={employeeName}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={loadNotes}
        noteToEdit={noteToEdit}
      />
    </div>
  )
}

export default HrNotesTab
