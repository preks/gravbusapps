import type { SearchItem } from '../types'

/**
 * True when the hit is an employee record (global search entity_type EMPLOYEE / label Employee).
 */
export function isSearchItemEmployeeHit(item: SearchItem): boolean {
  if (item.type.trim().toUpperCase() === 'EMPLOYEE') {
    return true
  }
  return item.typeLabel.trim().toLowerCase() === 'employee'
}
