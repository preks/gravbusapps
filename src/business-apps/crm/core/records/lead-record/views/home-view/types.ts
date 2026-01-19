import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'

export interface HomeViewProps extends BusinessAppContextProps {
  leadId: string
  lead: any
  rawLeadData: any
  activities: any[]
  notes: any[]
  tasks: any[]
  approvals: any[]
  sectionsLoading: boolean
  sectionsError: string | null
  loadSectionData: () => void
  activityActionProps: Omit<AppActionCommonProps, 'accessToken'>
  noteActionProps: Omit<AppActionCommonProps, 'accessToken'>
  taskActionProps: Omit<AppActionCommonProps, 'accessToken'>
  approvalActionProps: Omit<AppActionCommonProps, 'accessToken'>
}
