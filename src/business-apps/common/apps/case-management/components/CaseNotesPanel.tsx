/**
 * Case Notes Panel Component
 *
 * Displays case notes timeline with add/edit/delete functionality
 */

import React, { useState, useMemo } from 'react'
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
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { MessageSquare, Send, Eye, EyeOff, Clock, Pencil, Trash2, X, Check } from 'lucide-react'
import { CaseNote } from '../types'
import { formatRelativeTime } from '../utils'
import { useEmployeeNamesBatch } from '@/business-apps/ser/hooks/useEmployeeNamesBatch'

interface CaseNotesPanelProps {
  notes: CaseNote[]
  onAddNote: (content: string, visibility: 'internal' | 'external') => Promise<void>
  onEditNote?: (noteId: string, content: string) => Promise<void>
  onDeleteNote?: (noteId: string) => Promise<void>
  currentUserId: string
  readOnly?: boolean
  accessToken?: string
}

export const CaseNotesPanel: React.FC<CaseNotesPanelProps> = ({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  currentUserId,
  readOnly = false,
  accessToken
}) => {
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteVisibility, setNewNoteVisibility] = useState<'internal' | 'external'>('internal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Delete confirmation state
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Extract unique creator IDs from notes
  const creatorIds = useMemo(() => {
    const ids = notes.map(note => note.createdBy).filter(Boolean)
    return [...new Set(ids)]
  }, [notes])

  // Fetch employee data for all creators
  const { employees, displayNames } = useEmployeeNamesBatch({
    userIds: creatorIds,
    accessToken,
    enabled: creatorIds.length > 0
  })

  // Helper to get employee display info
  const getCreatorInfo = (userId: string) => {
    const employee = employees.get(userId)
    const displayName = displayNames.get(userId) || userId
    if (employee) {
      return {
        name: displayName,
        initials: displayName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        avatar: employee.pictureThumbnail ? `data:image/png;base64,${employee.pictureThumbnail}` : null
      }
    }
    return {
      name: userId,
      initials: userId.slice(0, 2).toUpperCase(),
      avatar: null
    }
  }

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

  const handleStartEdit = (note: CaseNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editContent.trim() || isEditing || !onEditNote) return

    try {
      setIsEditing(true)
      await onEditNote(editingNoteId, editContent)
      setEditingNoteId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to edit note:', error)
    } finally {
      setIsEditing(false)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteNoteId || isDeleting || !onDeleteNote) return

    try {
      setIsDeleting(true)
      await onDeleteNote(deleteNoteId)
      setDeleteNoteId(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if user can edit/delete a note (only their own notes)
  const canModifyNote = (note: CaseNote) => {
    return !readOnly && note.createdBy === currentUserId
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
              {notes.map((note, index) => {
                const creator = getCreatorInfo(note.createdBy)
                const isEditingThis = editingNoteId === note.id
                const canModify = canModifyNote(note)

                return (
                  <div
                    key={note.id || index}
                    className="gba:relative gba:pl-4 gba:border-l-2 gba:border-muted gba:pb-4 last:gba:pb-0"
                  >
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar className="gba:h-6 gba:w-6">
                          {creator.avatar && <AvatarImage src={creator.avatar} alt={creator.name} />}
                          <AvatarFallback className="gba:text-xs">{creator.initials}</AvatarFallback>
                        </Avatar>
                        <span className="gba:font-medium gba:text-sm">{creator.name}</span>
                        <Badge
                          variant={note.visibility === 'internal' ? 'secondary' : 'outline'}
                          className="gba:text-xs"
                        >
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
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:h-3 gba:w-3" />
                          {formatRelativeTime(note.createdAt)}
                          {note.updatedAt && note.updatedAt !== note.createdAt && ' (edited)'}
                        </span>
                        {/* Edit/Delete buttons - only show for user's own notes */}
                        {canModify && !isEditingThis && (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            {onEditNote && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-7 gba:w-7 gba:p-0"
                                onClick={() => handleStartEdit(note)}
                                title="Edit note"
                              >
                                <Pencil className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                              </Button>
                            )}
                            {onDeleteNote && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-7 gba:w-7 gba:p-0 hover:gba:text-destructive"
                                onClick={() => setDeleteNoteId(note.id)}
                                title="Delete note"
                              >
                                <Trash2 className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Note content - show either edit form or text */}
                    {isEditingThis ? (
                      <div className="gba:space-y-2 gba:mt-2">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          rows={3}
                          disabled={isEditing}
                          className="gba:resize-none gba:text-sm"
                          autoFocus
                          placeholder="Edit your note... (Ctrl+Enter to save, Escape to cancel)"
                        />
                        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isEditing}>
                            <X className="gba:h-4 gba:w-4 gba:mr-1" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || isEditing}>
                            <Check className="gba:h-4 gba:w-4 gba:mr-1" />
                            {isEditing ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={open => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
