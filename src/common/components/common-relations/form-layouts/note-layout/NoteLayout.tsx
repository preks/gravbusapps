import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import NoteSegment from '../../form-segments/note-segment/NoteSegment'
import type { NoteSegmentProps } from '../../form-segments/note-segment/NoteSegment'

export interface NoteLayoutProps extends Omit<NoteSegmentProps, 'titleLabel' | 'textLabel'> {
  // Labels (required)
  titleLabel: React.ReactNode
  textLabel: React.ReactNode
  reminderLabel?: React.ReactNode
  entityLabel?: React.ReactNode
  uploadFileLabel?: React.ReactNode

  // Placeholders (optional)
  titlePlaceholder?: string
  textPlaceholder?: string
  reminderPlaceholder?: string

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const NoteLayout: React.FC<NoteLayoutProps> = ({
  titleLabel,
  textLabel,
  reminderLabel,
  entityLabel,
  uploadFileLabel,
  titlePlaceholder,
  textPlaceholder,
  reminderPlaceholder,
  loading = false,
  ...segmentProps
}) => {
  // Show skeletons while loading
  if (loading) {
    return (
      <div data-testid="note-layout-loading" className="gba:space-y-4">
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-32 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
      </div>
    )
  }

  return (
    <NoteSegment
      {...segmentProps}
      data-testid="note-layout"
      titleLabel={titleLabel}
      textLabel={textLabel}
      reminderLabel={reminderLabel}
      entityLabel={entityLabel}
      uploadFileLabel={uploadFileLabel}
      titlePlaceholder={titlePlaceholder}
      textPlaceholder={textPlaceholder}
      reminderPlaceholder={reminderPlaceholder}
    />
  )
}

export default NoteLayout
