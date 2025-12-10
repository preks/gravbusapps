import { useMemo } from 'react'
import { OfficeAttendanceRecord, SiteLocationCapacity, KpiCardData, LocationUsageCardData } from '../types'
import { formatDate } from '../utils/dateUtils'

export const useUsageOverviewData = (
  attendance: OfficeAttendanceRecord[],
  locations: SiteLocationCapacity[],
  granularity: 'day' | 'week'
) => {
  // Calculate KPIs
  const kpis = useMemo<KpiCardData>(() => {
    if (attendance.length === 0 || locations.length === 0) {
      return {
        averageOccupancy: 0,
        peakOccupancy: 0,
        peakDate: '',
        mostUsedLocationName: '',
        mostUsedLocationOccupancy: 0,
        totalOfficeDays: 0
      }
    }

    // Group attendance by date and location
    const dailyOccupancy = new Map<string, Map<string, Set<string>>>()

    attendance.forEach(record => {
      const dateKey = record.attendanceDate
      if (!dailyOccupancy.has(dateKey)) {
        dailyOccupancy.set(dateKey, new Map())
      }
      const dayMap = dailyOccupancy.get(dateKey)!
      if (!dayMap.has(record.siteLocationId)) {
        dayMap.set(record.siteLocationId, new Set())
      }
      dayMap.get(record.siteLocationId)!.add(record.employeeId)
    })

    // Calculate daily occupancy percentages
    const dailyOccupancyPercentages: { date: string; percentage: number }[] = []
    const locationCapacityMap = new Map(locations.map(loc => [loc.siteLocationId, loc.capacity]))

    dailyOccupancy.forEach((locationMap, date) => {
      let totalOccupied = 0
      let totalCapacity = 0

      locationMap.forEach((employees, locationId) => {
        const capacity = locationCapacityMap.get(locationId) || 0
        if (capacity > 0) {
          totalOccupied += employees.size
          totalCapacity += capacity
        }
      })

      if (totalCapacity > 0) {
        dailyOccupancyPercentages.push({
          date,
          percentage: (totalOccupied / totalCapacity) * 100
        })
      }
    })

    // Average occupancy
    const averageOccupancy =
      dailyOccupancyPercentages.length > 0
        ? dailyOccupancyPercentages.reduce((sum, day) => sum + day.percentage, 0) / dailyOccupancyPercentages.length
        : 0

    // Peak occupancy
    const peakDay = dailyOccupancyPercentages.reduce((max, day) => (day.percentage > max.percentage ? day : max), {
      date: '',
      percentage: 0
    })

    // Most used location
    const locationOccupancy = new Map<string, { total: number; count: number }>()

    dailyOccupancy.forEach(locationMap => {
      locationMap.forEach((employees, locationId) => {
        const capacity = locationCapacityMap.get(locationId) || 0
        if (capacity > 0) {
          const percentage = (employees.size / capacity) * 100
          if (!locationOccupancy.has(locationId)) {
            locationOccupancy.set(locationId, { total: 0, count: 0 })
          }
          const stats = locationOccupancy.get(locationId)!
          stats.total += percentage
          stats.count += 1
        }
      })
    })

    let mostUsedLocationId = ''
    let mostUsedOccupancy = 0
    locationOccupancy.forEach((stats, locationId) => {
      const avg = stats.total / stats.count
      if (avg > mostUsedOccupancy) {
        mostUsedOccupancy = avg
        mostUsedLocationId = locationId
      }
    })

    const mostUsedLocation = locations.find(loc => loc.siteLocationId === mostUsedLocationId)

    return {
      averageOccupancy: Math.round(averageOccupancy),
      peakOccupancy: Math.round(peakDay.percentage),
      peakDate: peakDay.date ? formatDate(peakDay.date) : '',
      mostUsedLocationName: mostUsedLocation?.name || '',
      mostUsedLocationOccupancy: Math.round(mostUsedOccupancy),
      totalOfficeDays: attendance.length
    }
  }, [attendance, locations, granularity])

  // Calculate per-location usage cards
  const locationUsageCards = useMemo<LocationUsageCardData[]>(() => {
    if (attendance.length === 0 || locations.length === 0) return []

    return locations.map(location => {
      // Filter attendance for this location
      const locationAttendance = attendance.filter(record => record.siteLocationId === location.siteLocationId)

      if (locationAttendance.length === 0) {
        return {
          siteLocationId: location.siteLocationId,
          siteLocationName: location.name,
          capacity: location.capacity,
          averageOccupancy: 0,
          peakOccupancy: 0,
          peakDate: '',
          officeDays: 0,
          overCapacityDays: 0,
          sparklineData: []
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

      // Calculate stats
      const dailyPercentages: { date: string; percentage: number; count: number }[] = []
      dailyOccupancy.forEach((employees, date) => {
        const percentage = location.capacity > 0 ? (employees.size / location.capacity) * 100 : 0
        dailyPercentages.push({ date, percentage, count: employees.size })
      })

      const averageOccupancy =
        dailyPercentages.length > 0
          ? dailyPercentages.reduce((sum, day) => sum + day.percentage, 0) / dailyPercentages.length
          : 0

      const peakDay = dailyPercentages.reduce((max, day) => (day.percentage > max.percentage ? day : max), {
        date: '',
        percentage: 0,
        count: 0
      })

      const overCapacityDays = dailyPercentages.filter(day => day.percentage > 100).length

      return {
        siteLocationId: location.siteLocationId,
        siteLocationName: location.name,
        capacity: location.capacity,
        averageOccupancy,
        peakOccupancy: peakDay.percentage,
        peakDate: peakDay.date ? formatDate(peakDay.date) : '',
        officeDays: dailyOccupancy.size,
        overCapacityDays,
        sparklineData: dailyPercentages.map(d => d.percentage)
      }
    })
  }, [attendance, locations])

  return { kpis, locationUsageCards }
}
