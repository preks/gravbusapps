import React from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'
import CompaniesTab from './components/tabs/CompaniesTab'
import { SiteLocationsTab } from './components/tabs/SiteLocationsTab'
import { CapabilitiesTab } from './components/tabs/CapabilitiesTab'
import { CostCentersTab } from './components/tabs/CostCentersTab'
import { DepartmentsTab } from './components/tabs/DepartmentsTab'
import { TeamsTab } from './components/tabs/TeamsTab'
import GeoZoneTab from './components/tabs/GeoZoneTab'
import { BuildingsIcon } from '@phosphor-icons/react'

export enum OrganizationalDataTabs {
  COMPANIES = 'companies',
  SITE_LOCATIONS = 'site-locations',
  CAPABILITIES = 'capabilities',
  COST_CENTERS = 'cost-centers',
  DEPARTMENTS = 'departments',
  TEAMS = 'teams',
  GEO_ZONES = 'geo-zones'
}

export interface OrganizationalDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'OrganizationalData'

const OrganizationalData: React.FC<OrganizationalDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, onChangeTab] = useTabQueryParamSync(OrganizationalDataTabs, OrganizationalDataTabs.COMPANIES)

  const tabItems = [
    {
      key: OrganizationalDataTabs.COMPANIES,
      label: t('hr.companies', 'Companies'),
      children: <CompaniesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.SITE_LOCATIONS,
      label: t('hr.site_locations', 'Site Locations'),
      children: <SiteLocationsTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.CAPABILITIES,
      label: t('hr.capabilities', 'Capabilities'),
      children: <CapabilitiesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.COST_CENTERS,
      label: t('hr.cost_centers', 'Cost Centers'),
      children: <CostCentersTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.DEPARTMENTS,
      label: t('hr.departments', 'Departments'),
      children: <DepartmentsTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.TEAMS,
      label: t('hr.teams', 'Teams'),
      children: <TeamsTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: OrganizationalDataTabs.GEO_ZONES,
      label: t('hr.geo_zones', 'Geo Zones'),
      children: <GeoZoneTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    }
  ]

  return (
    <PageLayout
      headerIcon={<BuildingsIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={t('hr.organizational_data', 'Organizational Data')}
      className={`${className ?? ''} gba:!overflow-y-visible`.trim()}
      contentContainer={
        <div className="no-scrollbar gba:w-full gba:h-full gba:overflow-y-auto gba:pb-8" style={{ padding: '24px' }}>
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                {tabItems.map(item => (
                  <TabsTrigger key={item.key} value={item.key}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabItems.map(item => (
                <TabsContent key={item.key} value={item.key}>
                  {item.children}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      }
    />
  )
}

export default OrganizationalData
export { OrganizationalData }
