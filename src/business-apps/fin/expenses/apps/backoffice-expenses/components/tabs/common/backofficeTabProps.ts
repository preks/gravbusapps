import type { ReactNode } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface BackofficeTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
  isActive?: boolean
}
