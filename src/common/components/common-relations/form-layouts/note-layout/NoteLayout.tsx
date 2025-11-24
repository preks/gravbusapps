import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import NoteSegment from '../../form-segments/note-segment/NoteSegment'
import type { NoteSegmentProps } from '../../form-segments/note-segment/NoteSegment'

export interface NoteLayoutProps extends NoteSegmentProps {
  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const NoteLayout: React.FC<NoteLayoutProps> = ({ loading = false, ...segmentProps }) => {
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

  return <NoteSegment {...segmentProps} data-testid="note-layout" />
}

export default NoteLayout
