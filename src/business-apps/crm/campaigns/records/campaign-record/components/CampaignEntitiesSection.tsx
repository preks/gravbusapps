import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import type { CampaignEntitiesSectionProps } from '../types/CampaignRecordTypes'
import {
  CampaignAccountEntitiesView,
  CampaignContactEntitiesView,
  CampaignLeadEntitiesView,
  CampaignOpportunityEntitiesView
} from './campaign-entities'

type EntityTab = 'lead' | 'account' | 'contact' | 'opportunity'

export const CampaignEntitiesSection: React.FC<CampaignEntitiesSectionProps> = ({ campaignId, accessToken }) => {
  const [activeTab, setActiveTab] = useState<EntityTab>('lead')

  return (
    <div
      className="gba:w-full gba:pb-8 gba:bg-background gba:rounded-lg gba:p-2"
      data-testid="campaign-entities-section-wrapper"
    >
      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as EntityTab)}
        data-testid="campaign-entity-tabs"
      >
        <TabsList className="gba:mb-4">
          <TabsTrigger value="lead" data-testid="campaign-entities-tab-lead">
            Leads
          </TabsTrigger>
          <TabsTrigger value="account" data-testid="campaign-entities-tab-account">
            Accounts
          </TabsTrigger>
          <TabsTrigger value="contact" data-testid="campaign-entities-tab-contact">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="opportunity" data-testid="campaign-entities-tab-opportunity">
            Opportunities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lead" data-testid="campaign-entities-lead-view">
          <CampaignLeadEntitiesView accessToken={accessToken} campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="account" data-testid="campaign-entities-account-view">
          <CampaignAccountEntitiesView accessToken={accessToken} campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="contact" data-testid="campaign-entities-contact-view">
          <CampaignContactEntitiesView accessToken={accessToken} campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="opportunity" data-testid="campaign-entities-opportunity-view">
          <CampaignOpportunityEntitiesView accessToken={accessToken} campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CampaignEntitiesSection
