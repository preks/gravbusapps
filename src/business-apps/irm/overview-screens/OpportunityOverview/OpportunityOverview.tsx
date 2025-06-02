"use client"

import  { useState } from "react"
import { Card, CardContent } from "./common/ui/card"
import type { DetailedOpportunity } from "../../../../common/lib/db-actions"
import  OpportunitiesTable  from "./OpportunitiesTable"
import  OpportunityDetailContainer  from "./OpportunityDetailContainer"

interface OpportunityOverviewComponentProps {
  opportunity?: DetailedOpportunity
  pipeline?: any
  stages?: any[]
  isStandalone?: boolean
}

const sampleOpportunity: DetailedOpportunity = {
  id: "sample-1",
  name: "Enterprise Software Solution",
  companyName: "Acme Corporation",
  value: "75000",
  currency: "USD",
  pipelineName: "Enterprise Sales",
  stageName: "Negotiation",
  type: "incoming",
  description: "Enterprise-wide software implementation for streamlining operations and improving efficiency across departments.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contacts: [
    {
      id: "contact-1",
      name: "John Doe",
      position: "CTO",
      email: "john.doe@acme.com",
      phone: "+1 555-123-4567"
    }
  ],
  activities: [],
  documents: [],
  decisions: [],
  tasks: []
}

const samplePipeline = {
  id: "pipeline-1",
  name: "Enterprise Sales"
}

const sampleStages = [
  { id: "stage-1", name: "Qualification" },
  { id: "stage-2", name: "Meeting" },
  { id: "stage-3", name: "Proposal" },
  { id: "stage-4", name: "Negotiation" },
  { id: "stage-5", name: "Closed Won" }
]

 const OpportunityOverviewComponent = ({ 
  opportunity = sampleOpportunity,
  pipeline = samplePipeline,
  stages = sampleStages,
  isStandalone = true
}: OpportunityOverviewComponentProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const handleOpportunitySelect = (id: string) => {
    console.log("Selected opportunity:", id);
    setSelectedId(id);
  };
  
  const handleBack = () => {
    setSelectedId(null);
  };
  
  if (selectedId) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-300 rounded">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-300 pb-4">
              Opportunity Details
            </h2>
            <OpportunityDetailContainer 
              opportunityId={selectedId} 
              onBack={handleBack} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="border-gray-300 rounded">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-300 pb-4">
            Opportunities
          </h2>
          <OpportunitiesTable 
            isStandalone={isStandalone}
            onSelectOpportunity={handleOpportunitySelect}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OpportunityOverviewComponent;