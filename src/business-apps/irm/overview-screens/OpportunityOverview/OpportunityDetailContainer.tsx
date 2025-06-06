"use client"

import { useEffect, useState } from "react"
import opportunitiesData from "./opportunities.json"
import { Button } from "./common/ui/button"
import { ArrowLeft } from "lucide-react"
import type { DetailedOpportunity, Stage, StageRequirement } from "./lib/db-actions"
import OpportunityDetail from "./OpportunityDetail"

const sampleStages: Stage[] = [
  { id: "1", pipelineId: "1", name: "Initial Contact", order: 1, color: "gray", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "2", pipelineId: "1", name: "Qualification", order: 2, color: "blue", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "3", pipelineId: "1", name: "Proposal", order: 3, color: "purple", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "4", pipelineId: "1", name: "Negotiation", order: 4, color: "orange", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "5", pipelineId: "1", name: "Closed Won", order: 5, color: "green", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
]

const sampleStageRequirements: StageRequirement[] = [
  { 
    id: "sr-1", 
    stageId: "1", 
    type: "activity", 
    description: "Initial Contact", 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  { 
    id: "sr-2", 
    stageId: "2", 
    type: "activity", 
    description: "Business Need Identified", 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  { 
    id: "sr-3", 
    stageId: "3", 
    type: "document", 
    description: "Proposal Submitted", 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  { 
    id: "sr-4", 
    stageId: "4", 
    type: "decision", 
    description: "Contract Negotiation", 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  { 
    id: "sr-5", 
    stageId: "5", 
    type: "decision", 
    description: "Contract Signed", 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  }
]

interface OpportunityDetailContainerProps {
  opportunityId: string;
  onBack?: () => void;
}

export default function OpportunityDetailContainer({ opportunityId, onBack }: OpportunityDetailContainerProps) {
  console.log("OpportunityDetailContainer rendering with ID:", opportunityId);
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState<DetailedOpportunity | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log("OpportunityDetailContainer mounted");
    return () => console.log("OpportunityDetailContainer unmounted");
  }, []);
  
  useEffect(() => {
    console.log("OpportunityDetailContainer effect running for ID:", opportunityId);
    if (!opportunityId) {
      setError("No opportunity ID provided")
      setLoading(false)
      return
    }
    
    try {
      const foundOpportunity = opportunitiesData.find(opp => opp.id === opportunityId)
      console.log("Found opportunity:", foundOpportunity);
      
      if (!foundOpportunity) {
        setError(`Opportunity with ID ${opportunityId} not found`)
        setLoading(false)
        return
      }
      
      const companyName = foundOpportunity.companyId || "Unknown Company"
      
      const stageName = sampleStages.find(stage => stage.id === foundOpportunity.stageId)?.name || "Unknown"
      
      const detailedOpportunity = {
        ...foundOpportunity,
        stageName,
        companyName,
        pipelineName: "Venture Capital",
        activities: [],
        tasks: [],
        documents: [],
        decisions: [],
        investment: undefined,
        contacts: []
      } as DetailedOpportunity
      
      setOpportunity(detailedOpportunity)
      setLoading(false)
    } catch (err) {
      setError("Error loading opportunity data")
      setLoading(false)
      console.error("Error loading opportunity:", err)
    }
  }, [opportunityId])
  
  if (loading) {
    return <div className="gba-p-6">Loading opportunity details...</div>
  }
  
  if (error) {
    return (
      <div className="gba-p-6">
        <div className="gba-mb-4">
          <Button variant="ghost" onClick={onBack} className="gba-text-gray-600">
            <ArrowLeft className="gba-mr-2 gba-h-4 gba-w-4" />
            Back to Opportunities
          </Button>
        </div>
        <div className="gba-text-red-500">{error}</div>
      </div>
    )
  }
  
  if (!opportunity) {
    return <div className="gba-p-6">No opportunity data available</div>
  }

  return (
    <div className="gba-w-full">
      <OpportunityDetail 
        opportunity={opportunity}
        stages={sampleStages}
        stageRequirements={sampleStageRequirements}
        nextStageRequirements={[]}
        onBack={onBack}
      />
    </div>
  );
}
