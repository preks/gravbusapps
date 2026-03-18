import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const t = thumb.trim()
  if (!t) return undefined
  if (t.startsWith('http') || t.startsWith('data:')) return t
  if (t.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${t}`
  if (t.startsWith('R0lGOD')) return `data:image/gif;base64,${t}`
  return `data:image/jpeg;base64,${t}`
}

export const goToProfile = (employeeId: string) => {
  navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'summary' }))
}
