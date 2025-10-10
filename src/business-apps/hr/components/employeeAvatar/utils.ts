import { OnlineStatus, AvailabilityLocation } from './types'

/**
 * Generate a random online status for an employee
 * @returns Random online status
 */
export function getRandomOnlineStatus(): OnlineStatus {
  const statuses = Object.values(OnlineStatus)
  const randomIndex = Math.floor(Math.random() * statuses.length)
  return statuses[randomIndex]
}

/**
 * Generate a random availability location for an employee
 * @returns Random availability location
 */
export function getRandomAvailabilityLocation(): AvailabilityLocation {
  const locations = Object.values(AvailabilityLocation)
  const randomIndex = Math.floor(Math.random() * locations.length)
  return locations[randomIndex]
}
