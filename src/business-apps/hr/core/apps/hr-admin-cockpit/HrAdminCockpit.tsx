'use client'

import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataQualityComputedProvider } from './hooks/dataQualityHooks'
import { DataQualityDashboard } from './components/DataQualityDashboard'
import { useDataQualityDashboardModel } from './hooks/useDataQualityDashboardModel'

export function HrAdminCockpit({ accessToken }: Readonly<BusinessAppContextProps>) {
  const model = useDataQualityDashboardModel()

  return (
    <DataQualityComputedProvider accessToken={accessToken} activeTab={model.activeTab}>
      <DataQualityDashboard accessToken={accessToken} model={model} />
    </DataQualityComputedProvider>
  )
}

export default HrAdminCockpit
