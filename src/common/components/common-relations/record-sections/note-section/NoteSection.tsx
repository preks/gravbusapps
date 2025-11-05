import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system'
import { PlusIcon, UserIcon, CalendarBlankIcon, BellIcon, DotsThreeVertical } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { AppAction } from '@/components/app-action'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildFileUrl, getFileIcon } from '@/common/utils/fileUtils'
import { FileInfo } from '@/common/types/FileTypes'

export type NoteDocument = {
  id: string
  name: string
  mimeType?: string
  fileSize?: number
  file?: string
  fileInfo?: FileInfo
}

export type NoteItem = {
  id: string
  version?: number
  noteTitle: string
  noteText: string
  createdAt: string
  createdBy: string
  authorEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string }
  assigneeEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string }
  reminderAt?: string | null
  documents?: NoteDocument[]
}

export interface NoteSectionProps extends BusinessAppContextProps {
  notes?: NoteItem[]
  noteActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  noteEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  'data-testid'?: string
}

// Standard React component that can be used with SectionWrapper
const NoteSection: React.FC<NoteSectionProps> = props => {
  const { accessToken, notes: notesProp, noteEntityActionProps } = props

  const notes = notesProp || []

  // Handle document download
  const handleDocumentClick = (document: NoteDocument, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!document.fileInfo) {
      return
    }

    try {
      const fileUrl = buildFileUrl(document.fileInfo)
      window.open(fileUrl, '_blank')
    } catch {
      // Silent fail - fileInfo structure invalid
    }
  }

  const getAuthorName = (authorEmployee: any) => {
    if (!authorEmployee) return null

    // Use firstName + lastName first
    const fullName = `${authorEmployee.firstName || ''} ${authorEmployee.lastName || ''}`.trim()
    if (fullName) return fullName

    // Fallback to displayName
    return authorEmployee.displayName || null
  }

  const handleEmployeeClick = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId }))
  }

  return (
    <div data-testid={props['data-testid'] || 'note-section-new-content'} className="gba:space-y-4">
      {notes.length === 0 ? (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground">No notes yet. Create your first note.</div>
      ) : (
        notes.map(note => (
          <Card key={note.id} className="gba:shadow-none gba:border gba:border-gray-200">
            <CardHeader className="gba:pb-2">
              <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:w-full">
                <CardTitle className="gba:text-base gba:flex-1 gba:truncate gba:min-w-0">{note.noteTitle}</CardTitle>
                {noteEntityActionProps && (
                  <AppActionMenu
                    accessToken={accessToken}
                    contextsArray={noteEntityActionProps.contextsArray}
                    externalContextData={{
                      ...noteEntityActionProps.externalContextData,
                      noteId: note.id,
                      version: note.version
                    }}
                    prefixDataTestId={`${noteEntityActionProps.prefixDataTestId}-${note.id}`}
                    deferMainContextRequestsUntilClick={true}
                    emptyStateBehavior="enable"
                  >
                    <div
                      className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-gray-100 gba:transition-colors gba:shrink-0"
                      data-testid={`note-menu-${note.id}`}
                    >
                      <DotsThreeVertical size={16} />
                    </div>
                  </AppActionMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <p className="gba:text-sm gba:text-gray-700 gba:mb-2">{note.noteText}</p>
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1 gba:text-xs gba:text-muted-foreground">
                <span className="gba:flex gba:items-center gba:gap-1">
                  <UserIcon size={12} />
                  {note.authorEmployee?.id && getAuthorName(note.authorEmployee) ? (
                    <a
                      href={buildPlatformUrl('/platform/hr/core/employees/employee-record', {
                        employeeId: note.authorEmployee.id
                      })}
                      onClick={e => {
                        e.preventDefault()
                        handleEmployeeClick(note.authorEmployee!.id!)
                      }}
                      className="gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
                      data-testid={`note-author-link-${note.authorEmployee.id}`}
                    >
                      {getAuthorName(note.authorEmployee)}
                    </a>
                  ) : (
                    note.createdBy
                  )}
                </span>
                <span className="gba:flex gba:items-center gba:gap-1">
                  <CalendarBlankIcon size={12} /> {dayjs(note.createdAt).format('MMM D, YYYY h:mm A')}
                </span>
                {note.assigneeEmployee?.id && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <UserIcon size={12} /> Assigned to{' '}
                    <a
                      href={buildPlatformUrl('/platform/hr/core/employees/employee-record', {
                        employeeId: note.assigneeEmployee.id
                      })}
                      onClick={e => {
                        e.preventDefault()
                        handleEmployeeClick(note.assigneeEmployee!.id!)
                      }}
                      className="gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
                      data-testid={`note-assignee-link-${note.assigneeEmployee.id}`}
                    >
                      {getAuthorName(note.assigneeEmployee) || note.assigneeEmployee.displayName}
                    </a>
                  </span>
                )}
                {note.reminderAt && (
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-orange-600">
                    <BellIcon size={12} /> Reminder {dayjs(note.reminderAt).format('MMM D, YYYY h:mm A')}
                  </span>
                )}
              </div>
              {note.documents && note.documents.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-3" data-testid={`note-documents-${note.id}`}>
                  {note.documents.map(doc => {
                    const FileIcon = getFileIcon(doc.mimeType)
                    return (
                      <button
                        key={doc.id}
                        onClick={e => handleDocumentClick(doc, e)}
                        className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
                        data-testid={`note-document-${note.id}-${doc.id}`}
                        title={doc.name}
                      >
                        <FileIcon size={14} weight="bold" />
                        <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}{' '}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// Static properties for SectionWrapper
;(NoteSection as any).sectionTitle = 'Notes'
;(NoteSection as any).sectionActions = (props: NoteSectionProps) => {
  const { accessToken, noteActionProps } = props

  if (!noteActionProps) {
    return null
  }

  return (
    <AppAction
      accessToken={accessToken}
      contextsArray={noteActionProps.contextsArray}
      externalContextData={noteActionProps.externalContextData}
      prefixDataTestId={noteActionProps.prefixDataTestId}
      emptyStateBehavior={noteActionProps.emptyStateBehavior}
    >
      <Button data-testid="add-note-button" variant="secondary" size="icon">
        <PlusIcon />
      </Button>
    </AppAction>
  )
}

export default NoteSection
