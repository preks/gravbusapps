import React from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGlobalSearchClient } from '@/common/network/global-search'
import { AnalyticsTab } from './components/AnalyticsTab'
import { EntitiesTab } from './components/EntitiesTab'
import { JobsTab } from './components/JobsTab'
import { SearchTab } from './components/SearchTab'
import { SynchronizationTab } from './components/SynchronizationTab'

export const GlobalSearchManager: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const client = useGlobalSearchClient(accessToken)

  return (
    <div className="gba:w-full" data-testid="global-search-manager-app">
      <PageLayout
        headerIcon={MagnifyingGlassIcon}
        headerTitle="Global Search Manager"
        headerDescription="Manage global search results, analytics, background jobs, entity types, and synchronization."
        className="gba:min-h-screen"
      >
        <Tabs defaultValue="search" className="gba:space-y-4">
          <TabsList className="gba:flex gba:flex-wrap gba:h-auto">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="entities">Entity Types</TabsTrigger>
            <TabsTrigger value="sync">Synchronization</TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <SearchTab client={client} />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab client={client} />
          </TabsContent>
          <TabsContent value="jobs">
            <JobsTab client={client} />
          </TabsContent>
          <TabsContent value="entities">
            <EntitiesTab client={client} />
          </TabsContent>
          <TabsContent value="sync">
            <SynchronizationTab client={client} />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </div>
  )
}
