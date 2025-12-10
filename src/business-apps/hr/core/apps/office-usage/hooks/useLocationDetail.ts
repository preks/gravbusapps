import { useMemo } from 'react'
import { OfficeAttendanceRecord, SiteLocationCapacity, LocationDetail, DailyOccupancyData } from '../types'
import { formatDate } from '../utils/dateUtils'

export const useLocationDetail = (
  locationId: string | null,
  attendance: OfficeAttendanceRecord[],
  locations: SiteLocationCapacity[]
): LocationDetail | null => {
  return useMemo(() => {
    if (!locationId) return null

    const location = locations.find(loc => loc.siteLocationId === locationId)
    if (!location) return null

    // Filter attendance for this location
    const locationAttendance = attendance.filter(record => record.siteLocationId === locationId)

    if (locationAttendance.length === 0) {
      return {
        siteLocationId: location.siteLocationId,
        siteLocationName: location.name,
        capacity: location.capacity,
        averageOccupancy: 0,
        peakOccupancy: 0,
        peakDate: '',
        averageOccupied: 0,
        peakOccupied: 0,
        dailyData: []
      }
    }

    // Group by date
    const dailyOccupancy = new Map<string, Set<string>>()
    locationAttendance.forEach(record => {
      if (!dailyOccupancy.has(record.attendanceDate)) {
        dailyOccupancy.set(record.attendanceDate, new Set())
      }
      dailyOccupancy.get(record.attendanceDate)!.add(record.employeeId)
    })

    // Build daily data
    const dailyData: DailyOccupancyData[] = []
    let totalOccupied = 0
    let peakOccupied = 0
    let peakDate = ''

    dailyOccupancy.forEach((employees, date) => {
      const occupied = employees.size
      const occupancyPercentage = location.capacity > 0 ? (occupied / location.capacity) * 100 : 0
      const overCapacity = occupancyPercentage > 100

      dailyData.push({
        date: formatDate(date),
        occupancyPercentage,
        occupied,
        capacity: location.capacity,
        overCapacity
      })

      totalOccupied += occupied
      if (occupancyPercentage > peakOccupied) {
        peakOccupied = occupancyPercentage
        peakDate = formatDate(date)
      }
    })

    // Sort by date descending
    dailyData.sort((a, b) => b.date.localeCompare(a.date))

    const averageOccupied = dailyData.length > 0 ? totalOccupied / dailyData.length : 0
    const averageOccupancy = location.capacity > 0 ? (averageOccupied / location.capacity) * 100 : 0

    return {
      siteLocationId: location.siteLocationId,
      siteLocationName: location.name,
      capacity: location.capacity,
      averageOccupancy,
      peakOccupancy: peakOccupied,
      peakDate,
      averageOccupied,
      peakOccupied: location.capacity > 0 ? Math.round((peakOccupied * location.capacity) / 100) : 0,
      dailyData
    }
  }, [locationId, attendance, locations])
}
