"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./common/ui/button"
import { Card, CardContent } from "./common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./common/ui/tabs"
import { ArrowLeft, Calendar, DollarSign, Building2, User2 } from "lucide-react"
import { OpportunityActivities } from "./opportunity-tabs/OpportunityActivities"
import { OpportunityDocuments } from "./opportunity-tabs/OpportunityDocuments"
import { OpportunityDecisions } from "./opportunity-tabs/OpportunityDecisions"
import { OpportunityTasks } from "./opportunity-tabs/OpportunityTasks"
import { OpportunityInvestment } from "./opportunity-tabs/OpportunityInvestment"
import CreateInvestmentModal from "./CreateInvestmentModal"
import type { DetailedOpportunity, Stage, StageRequirement } from "../../../../common/lib/db-actions"
import opportunitiesData from "./opportunities.json"

const sampleStages: Stage[] = [
  { id: "1", pipelineId: "1", name: "Initial Contact", order: 1, color: "gray", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "2", pipelineId: "1", name: "Qualification", order: 2, color: "blue", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "3", pipelineId: "1", name: "Proposal", order: 3, color: "purple", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "4", pipelineId: "1", name: "Negotiation", order: 4, color: "orange", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "5", pipelineId: "1", name: "Closed Won", order: 5, color: "green", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
]

const sampleStageRequirements: StageRequirement[] = [
  { id: "sr-1", stageId: "1", type: "activity", description: "Initial Contact", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "sr-2", stageId: "2", type: "activity", description: "Business Need Identified", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "sr-3", stageId: "3", type: "document", description: "Proposal Submitted", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "sr-4", stageId: "4", type: "decision", description: "Contract Negotiation", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "sr-5", stageId: "5", type: "decision", description: "Contract Signed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
]

const sampleActivities = [
  {
    id: "act-001",
    opportunityId: "opp-001",
    type: "meeting",
    title: "European Market Assessment",
    description: "Strategy meeting to evaluate European logistics software market and potential acquisition targets.",
    date: "2023-12-05T10:30:00Z",
    user: {
      id: "user-001",
      name: "Jane Smith",
      initials: "JS",
      avatar: ""
    },
    createdAt: new Date().toISOString(),  
    updatedAt: new Date().toISOString() 
  },
  {
    id: "act-002",
    opportunityId: "opp-001",
    type: "call",
    title: "Initial Client Discussion",
    description: "Phone call with the client to discuss investment requirements and potential terms.",
    date: "2024-01-15T14:45:00Z",
    user: {
      id: "user-002",
      name: "Robert Johnson",
      initials: "RJ",
      avatar: ""
    },
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  {
    id: "act-003",
    opportunityId: "opp-001",
    type: "email",
    title: "Proposal Details Follow-up",
    description: "Sent email with detailed investment proposal and supporting documentation for review.",
    date: "2024-02-10T09:15:00Z",
    user: {
      id: "user-001",
      name: "Jane Smith",
      initials: "JS",
      avatar: ""
    },
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  },
  {
    id: "act-004",
    opportunityId: "opp-001", 
    type: "note",
    title: "Due Diligence Findings",
    description: "Initial findings from the due diligence process. Several key areas need further investigation before proceeding.",
    date: "2024-03-20T16:00:00Z",
    user: {
      id: "user-003",
      name: "Michael Chen",
      initials: "MC",
      avatar: ""
    },
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString()  
  }
];

interface OpportunityDetailProps {
  opportunity?: DetailedOpportunity | null
  opportunityId?: string
  stages?: Stage[]
  stageRequirements?: StageRequirement[]
  nextStageRequirements?: StageRequirement[]
  onBack?: () => void
}

export default function OpportunityDetail({
  opportunity: initialOpportunity,
  opportunityId,
  stages = sampleStages,
  stageRequirements = sampleStageRequirements,
  onBack,
}: OpportunityDetailProps) {
  const [activeTab, setActiveTab] = useState("activities")
  const [opportunity, setOpportunity] = useState<DetailedOpportunity | null>(initialOpportunity || null)
  const [loading, setLoading] = useState(!initialOpportunity && !!opportunityId)
  const [error, setError] = useState<string | null>(null)
  
  let navigate: any;
  try {
    navigate = useNavigate();
  } catch (error) {
    navigate = { back: () => console.log("Navigation not available") };
  }

  useEffect(() => {
    if (!initialOpportunity && opportunityId) {
      setLoading(true);
      
      try {
        const foundOpportunity = opportunitiesData.find(opp => opp.id === opportunityId);
        
        if (!foundOpportunity) {
          setError(`Opportunity with ID ${opportunityId} not found`);
          setLoading(false);
          return;
        }
        
        const companyName = foundOpportunity.companyId || "Unknown Company";
        
        const stageName = stages.find(stage => stage.id === foundOpportunity.stageId)?.name || "Unknown";
        
        const detailedOpportunity = {
          ...foundOpportunity,
          stageName,
          companyName,
          pipelineName: "Venture Capital",
          investment: undefined, 
          activities: sampleActivities, 
          tasks: [],
          documents: [],
          decisions: [],
          contacts: [] 
        } as DetailedOpportunity;
        
        setOpportunity(detailedOpportunity);
      } catch (err) {
        setError("Error loading opportunity data");
        console.error("Error loading opportunity:", err);
      } finally {
        setLoading(false);
      }
    }
  }, [initialOpportunity, opportunityId, stages]);

  useEffect(() => {
    if (opportunity) {
      console.log("OpportunityDetail - Opportunity:", opportunity)
      console.log("OpportunityDetail - Stages:", stages)
    }
  }, [opportunity, stages])

  const handleStageChange = async (newStageId: string) => {
    try {
      
      const newStage = stages.find((stage) => stage.id === newStageId)

      if (newStage && opportunity) {
        setOpportunity({
          ...opportunity,
          stageId: newStageId,
          stageName: newStage.name,
        })
      }
      
      console.log(`Stage updated to: ${newStage?.name}`);
      
    } catch (error) {
      console.error("Error updating stage:", error)
    }
  }

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      try {
        navigate(-1);
      } catch (error) {
        console.log("Navigation not available");
      }
    }
  }

  if (loading) {
    return <div className="flex flex-col gap-6 p-6">Loading opportunity details...</div>
  }
  
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Opportunities
        </Button>
        <div className="text-red-500">{error}</div>
      </div>
    )
  }
  
  if (!opportunity) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Opportunities
        </Button>
        <div>No opportunity data available</div>
      </div>
    )
  }

  const hasInvestment = !!opportunity.investment

  const hasStages = Array.isArray(stages) && stages.length > 0

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-gray-600" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Button>
          
          {!opportunity.investment && (
            <CreateInvestmentModal
              opportunityId={opportunity.id}
              opportunityName={opportunity.name}
              opportunityValue={opportunity.value}
              opportunityCurrency={opportunity.currency}
              companyId={opportunity.companyId}
            />
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-semibold">{opportunity.name}</h1>
          <div className="flex items-center mt-2 text-gray-500 space-x-4">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              <span>{opportunity.companyName}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>{opportunity.currency} {opportunity.value}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Expected close: {formatDate(opportunity.expectedCloseDate)}</span>
            </div>
            <div className="flex items-center">
              <User2 className="h-4 w-4 mr-1" />
              <span>Owner: {opportunity.ownerId || "Unassigned"}</span>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
              {opportunity.stageName || "No Stage"}
            </span>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
              {opportunity.probability || "0%"} probability
            </span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Stage Progression</h3>
        </div>
        <div className="flex items-center py-2">
          {[
            { id: "1", pipelineId: "1", name: "Initial Contact", order: 1, color: "gray", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "2", pipelineId: "1", name: "Qualification", order: 2, color: "blue", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "3", pipelineId: "1", name: "Proposal", order: 3, color: "purple", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "4", pipelineId: "1", name: "Negotiation", order: 4, color: "orange", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "5", pipelineId: "1", name: "Closed Won", order: 5, color: "green", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "6", pipelineId: "1", name: "Closed Lost", order: 6, color: "red", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          ].map((stage, index, allStages) => {
            const isActive = stage.id === opportunity.stageId;
            const isPast = parseInt(stage.id) < parseInt(opportunity.stageId || "0");
            const isLast = index === allStages.length - 1;
            
            let stageStyle = '';
            if (isActive) {
              stageStyle = 'bg-blue-100 text-blue-800 border border-blue-200';
            } else if (isPast) {
              stageStyle = 'bg-gray-100 text-gray-600 border border-gray-200';
            } else {
              stageStyle = 'bg-white text-gray-400 border border-gray-200 border-dashed';
            }
            
            return (
              <div key={stage.id} className="flex items-center">
                <div 
                  className={`flex items-center justify-center px-3 py-1 text-xs rounded-md 
                    whitespace-nowrap ${stageStyle}`}
                  style={{ minWidth: '85px' }}
                >
                  {isPast && (
                    <span className="mr-1 w-4 h-4 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center"></span>
                  )}
                  {stage.name}
                </div>
                {!isLast && (
                  <div className="w-5 h-px bg-gray-200 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <Tabs defaultValue="activities" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex border-b border-gray-200 p-0 m-0 bg-gray-100 justify-start">
          <TabsTrigger 
            value="overview"
            className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="activities"
            className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
          >
            Activities
          </TabsTrigger>
          <TabsTrigger 
            value="tasks"
            className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="documents"
            className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger 
            value="decisions"
            className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
          >
            Decisions
          </TabsTrigger>
          {hasInvestment && opportunity.investment && (
            <TabsTrigger 
              value="investment"
              className="py-2 px-4 text-sm text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 rounded-none"
            >
              Investment
            </TabsTrigger>
          )}
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-gray-300">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Description</h3>
                  <p>{opportunity.description}</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-300">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Key Contacts</h3>
                  <p className="text-gray-500">No contacts associated with this opportunity</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-300">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Opportunity Details</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Value</p>
                      <p>{opportunity.value}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expected Close Date</p>
                      <p>{formatDate(opportunity.expectedCloseDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Owner</p>
                      <p>{opportunity.ownerId || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p>{formatDate(opportunity.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p>{formatDate(opportunity.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-300">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Probability</h3>
                  <div className="space-y-4">
                    <div className="text-center text-4xl font-bold">
                      {opportunity.probability || "0"}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-gray-900 h-2.5 rounded-full" 
                        style={{ width: `${opportunity.probability || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="activities" className="space-y-4">
            <OpportunityActivities activities={opportunity.activities || []} opportunityId={opportunity.id} />
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-4">
            <OpportunityTasks
              tasks={opportunity.tasks || []}
              opportunityId={opportunity.id}
              stageRequirements={stageRequirements}
            />
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            <OpportunityDocuments
              documents={opportunity.documents || []}
              opportunityId={opportunity.id}
              stageRequirements={stageRequirements}
            />
          </TabsContent>
          
          <TabsContent value="decisions" className="space-y-4">
            <OpportunityDecisions
              decisions={opportunity.decisions || []}
              opportunityId={opportunity.id}
              stageRequirements={stageRequirements}
            />
          </TabsContent>
          
          {hasInvestment && opportunity.investment && (
            <TabsContent value="investment" className="space-y-4">
              <OpportunityInvestment investment={opportunity.investment} opportunityId={opportunity.id} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}