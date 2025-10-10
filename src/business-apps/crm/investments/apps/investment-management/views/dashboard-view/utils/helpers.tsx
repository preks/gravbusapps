import React from 'react'
import { Badge } from '@newwork/nw-design-system'

export const getStatusBadge = (status: string) => {
  if (status === 'active') {
    return <Badge className="gba:bg-green-100 gba:text-green-700 gba:border-green-200">active</Badge>
  } else if (status === 'under review') {
    return <Badge className="gba:bg-yellow-100 gba:text-yellow-700 gba:border-yellow-200">under review</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

export const getROIColor = (roi: string) => {
  const roiValue = parseFloat(roi.replace('%', ''))
  if (roiValue >= 20) return 'gba:text-green-600'
  if (roiValue >= 10) return 'gba:text-green-600'
  if (roiValue >= 5) return 'gba:text-yellow-600'
  return 'gba:text-red-600'
}
