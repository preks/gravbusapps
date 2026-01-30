/**
 * Case Notes Panel Component
 *
 * Displays case notes timeline with add/edit functionality
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Textarea,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { MessageSquare, Send, Eye, EyeOff, Clock } from 'lucide-react'
import { CaseNote } from '../types'
import { formatRelativeTime } from '../utils'

interface CaseNotesPanelProps {
  notes: CaseNote[]
  onAddNote: (content: string, visibility: 'internal' | 'external') => Promise<void>
  onEditNote?: (noteId: string, content: string) => Promise<void>
  onDeleteNote?: (noteId: string) => Promise<void>
  currentUserId: string
  readOnly?: boolean
}

export const CaseNotesPanel: React.FC<CaseNotesPanelProps> = ({
  notes,
  onAddNote,
  currentUserId: _currentUserId,
  readOnly = false
}) => {
  // currentUserId will be used for highlighting own notes in future
  void _currentUserId
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteVisibility, setNewNoteVisibility] = useState<'internal' | 'external'>('internal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onAddNote(newNoteContent, newNoteVisibility)
      setNewNoteContent('')
      setNewNoteVisibility('internal')
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddNote()
    }
  }

  return (
    <div className="gba:space-y-4">
      {/* Add Note Form */}
      {!readOnly && (
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:space-y-3">
              <Textarea
                placeholder="Write a note... (Ctrl+Enter to send)"
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={isSubmitting}
                className="gba:resize-none"
              />
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                <div className="gba:flex gba:items-center gba:gap-2">
                  {newNoteVisibility === 'internal' ? (
                    <EyeOff className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  ) : (
                    <Eye className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  )}
                  <Select
                    value={newNoteVisibility}
                    onValueChange={(value: 'internal' | 'external') => setNewNoteVisibility(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="gba:w-[120px] gba:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddNote} disabled={!newNoteContent.trim() || isSubmitting} size="sm">
                  <Send className="gba:h-4 gba:w-4 gba:mr-2" />
                  {isSubmitting ? 'Sending...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <Card>
        <CardContent className="gba:p-4">
          {notes.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              <MessageSquare className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-40" />
              <p className="gba:font-medium">No notes yet</p>
              {!readOnly && <p className="gba:text-sm gba:mt-1">Be the first to add a note</p>}
            </div>
          ) : (
            <div className="gba:space-y-4">
              {notes.map((note, index) => (
                <div
                  key={note.id || index}
                  className="gba:relative gba:pl-4 gba:border-l-2 gba:border-muted gba:pb-4 last:gba:pb-0"
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:font-medium gba:text-sm">{note.createdBy || 'Unknown'}</span>
                      <Badge variant={note.visibility === 'internal' ? 'secondary' : 'outline'} className="gba:text-xs">
                        {note.visibility === 'internal' ? (
                          <>
                            <EyeOff className="gba:h-3 gba:w-3 gba:mr-1" />
                            Internal
                          </>
                        ) : (
                          <>
                            <Eye className="gba:h-3 gba:w-3 gba:mr-1" />
                            External
                          </>
                        )}
                      </Badge>
                    </div>
                    <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                      <Clock className="gba:h-3 gba:w-3" />
                      {formatRelativeTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
