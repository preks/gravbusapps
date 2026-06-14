import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Customer360Snapshot } from '../../../data/types'
import Customer360JournalFeed from '../../../shared/Customer360JournalFeed'

export interface JournalViewProps extends BusinessAppContextProps {
  snapshot: Customer360Snapshot
  loading?: boolean
}

const JournalView: React.FC<JournalViewProps> = ({ snapshot, loading }) => (
  <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-journal-view">
    <Customer360JournalFeed entries={snapshot.journal ?? []} loading={loading} testId="customer-360-journal-feed" />
  </div>
)

export default JournalView
export { JournalView }
