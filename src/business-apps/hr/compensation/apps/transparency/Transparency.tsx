import { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { HrAnalyticsFiltersProvider } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/context/HrAnalyticsFiltersContext'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies'

import { Compensation } from './components/views/compensation'

export function Transparency(context: Readonly<BusinessAppContextProps>) {
  const { companies } = useActiveStructureCompanies(context.accessToken)

  const companyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const company of companies) {
      map[company.id] = company.name
    }
    return map
  }, [companies])

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  return (
    <div data-testid="compensation-transparency-app">
      <HrAnalyticsFiltersProvider
        selectedCompanyIds={selectedCompanyIds}
        setSelectedCompanyIds={setSelectedCompanyIds}
        companyLabelMap={companyLabelMap}
      >
        <Compensation {...context} />
      </HrAnalyticsFiltersProvider>
    </div>
  )
}

export default Transparency
