import { useMemo } from 'react'
import { LivePresenceRecord, SiteLocationCapacity, LivePresenceLocationCard, LivePresenceEmployee } from '../types'
import { formatDate } from '@/common/utils/windowUtils'

export const useLivePresenceData = (presence: LivePresenceRecord[], locations: SiteLocationCapacity[]) => {
  const formatPresenceTime = (value?: string): string => {
    const formatted = formatDate(value, 'date.short', 'HH:mm')
    return formatted || '-'
  }

  // Group presence by location
  const locationCards = useMemo<LivePresenceLocationCard[]>(() => {
    if (presence.length === 0 || locations.length === 0) return []

    return locations.map(location => {
      // Filter presence for this location
      const locationPresence = presence.filter(record => record.siteLocationId === location.siteLocationId)

      const currentOccupied = locationPresence.length
      const currentOccupancyPercentage = location.capacity > 0 ? (currentOccupied / location.capacity) * 100 : 0

      // For now, all people are "in office now" since we're filtering for active attendance
      const peopleInOfficeNow: LivePresenceEmployee[] = locationPresence.map(record => ({
        employeeId: record.employeeId,
        displayName: record.employee.displayName,
        pictureUrl: record.employee.pictureUrl,
        jobTitle: record.employee.jobTitle,
        organizationalUnit: record.employee.organizationalUnit,
        siteLocationName: record.siteLocationName,
        startTime: formatPresenceTime(record.startTime),
        expectedEndTime: record.expectedEndTime ? formatPresenceTime(record.expectedEndTime) : undefined
      }))

      const peopleDueLater: LivePresenceEmployee[] = []

      return {
        siteLocationId: location.siteLocationId,
        siteLocationName: location.name,
        capacity: location.capacity,
        currentOccupied,
        currentOccupancyPercentage,
        peopleInOfficeNow,
        peopleDueLater
      }
    })
  }, [presence, locations])

  // Flatten all people for list view
  const allPeople = useMemo<LivePresenceEmployee[]>(() => {
    return presence.map(record => {
      const location = locations.find(loc => loc.siteLocationId === record.siteLocationId)
      return {
        employeeId: record.employeeId,
        displayName: record.employee.displayName,
        pictureUrl: record.employee.pictureUrl,
        jobTitle: record.employee.jobTitle,
        organizationalUnit: record.employee.organizationalUnit,
        siteLocationName: location?.name || record.siteLocationName,
        startTime: formatPresenceTime(record.startTime),
        expectedEndTime: record.expectedEndTime ? formatPresenceTime(record.expectedEndTime) : undefined
      }
    })
  }, [presence, locations])

  return { locationCards, allPeople }
}
