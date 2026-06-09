import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { ExportEntitySelectorItem } from '../components/ExportEntitySelectorPage'

export function createExportEntityCard(
  title: string,
  icon: PhosphorIcon,
  entityType: string
): ExportEntitySelectorItem {
  return {
    title,
    icon,
    entityType
  }
}
