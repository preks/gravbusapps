import { useState, useCallback } from 'react'

export type StatusBucket = 'Open' | 'Won' | 'Lost'

export interface StatusSelection {
  status: StatusBucket
}

export interface StatusDrillDownState {
  selectedStatus: StatusSelection | null
  handleStatusClick: (status: StatusBucket) => void
  handleStatusClose: () => void
}

export const useStatusDrillDownState = (): StatusDrillDownState => {
  const [selectedStatus, setSelectedStatus] = useState<StatusSelection | null>(null)

  const handleStatusClick = useCallback((status: StatusBucket) => {
    setSelectedStatus(prev => (prev?.status === status ? null : { status }))
  }, [])

  const handleStatusClose = useCallback(() => {
    setSelectedStatus(null)
  }, [])

  return { selectedStatus, handleStatusClick, handleStatusClose }
}
