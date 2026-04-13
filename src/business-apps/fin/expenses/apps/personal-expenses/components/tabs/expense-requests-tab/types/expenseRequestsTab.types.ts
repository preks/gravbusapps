import type { ReactNode } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}
