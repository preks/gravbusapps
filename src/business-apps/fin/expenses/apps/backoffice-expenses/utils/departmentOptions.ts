import type { OrganizationalUnit } from '../hooks/useFilterData'

export interface DepartmentOption {
  id: string
  name: string
}

export const getActiveStructureDepartmentOptions = (
  organizationalUnits: OrganizationalUnit[] = []
): DepartmentOption[] => {
  const byId = new Map<string, DepartmentOption>()

  organizationalUnits.forEach(unit => {
    const id = String(unit?.id || '').trim()
    const name = String(unit?.displayName || unit?.name || '').trim()
    if (!id || !name) return
    if (!byId.has(id)) {
      byId.set(id, { id, name })
    }
  })

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const getActiveStructureDepartmentNames = (organizationalUnits: OrganizationalUnit[] = []): string[] => {
  return Array.from(new Set(getActiveStructureDepartmentOptions(organizationalUnits).map(option => option.name))).sort(
    (a, b) => a.localeCompare(b)
  )
}
