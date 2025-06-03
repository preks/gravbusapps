"use client"

import { useState } from "react"
import { Button } from "./common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./common/ui/dialog"
import { CheckCircle2, AlertCircle, FileText, Calendar, CheckSquare } from "lucide-react"
import { checkAllRequirementsMet, getStageColorClass, type StageRequirement } from "../../../../common/lib/stage-requirements"
import type { DetailedOpportunity, Stage } from "../../../../common/lib/db-actions"

interface StageProgressionBarProps {
  opportunity?: DetailedOpportunity
  stages?: Stage[]
  nextStageRequirements?: StageRequirement[]
  onStageChange?: (newStageId: string) => void
}

const demoStageRequirements = {
  "1": [
    {
      id: "disc-1",
      type: "activity",
      description: "Initial discovery call",
      status: "completed",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "disc-2",
      type: "activity",
      description: "Needs assessment meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "disc-3",
      type: "document",
      description: "Client profile document",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
  ],
  "2": [
    {
      id: "qual-1",
      type: "document",
      description: "Requirements specification",
      status: "completed",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "qual-2",
      type: "activity",
      description: "Budget discussion call",
      status: "completed",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "qual-3",
      type: "decision",
      description: "Solution approach approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
  ],
  "3": [
    {
      id: "prop-1",
      type: "document",
      description: "Formal proposal document",
      status: "completed",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "prop-2",
      type: "activity",
      description: "Proposal presentation meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "prop-3",
      type: "document",
      description: "Pricing breakdown",
      status: "completed",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
  ],
  "4": [
    {
      id: "neg-1",
      type: "activity",
      description: "Terms negotiation call",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "neg-2",
      type: "decision",
      description: "Final pricing approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
    {
      id: "neg-3",
      type: "document",
      description: "Contract draft",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
  ],
  "5": [
    {
      id: "won-1",
      type: "document",
      description: "Signed contract",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "won-2",
      type: "decision",
      description: "Final executive approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
    {
      id: "won-3",
      type: "activity",
      description: "Kickoff meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
  ],
  "6": [
    {
      id: "lost-1",
      type: "document",
      description: "Loss analysis report",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "lost-2",
      type: "activity",
      description: "Debrief meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
  ],
  "7": [
    {
      id: "lead-1",
      type: "activity",
      description: "Initial contact call",
      status: "completed",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "lead-2",
      type: "document",
      description: "Lead qualification form",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
  ],
  "8": [
    {
      id: "need-1",
      type: "activity",
      description: "Requirements gathering session",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "need-2",
      type: "document",
      description: "Needs assessment document",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "need-3",
      type: "decision",
      description: "Budget range confirmation",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
  ],
  "9": [
    {
      id: "sol-1",
      type: "document",
      description: "Solution specification",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "sol-2",
      type: "activity",
      description: "Solution review meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "sol-3",
      type: "decision",
      description: "Solution approach approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
  ],
  "10": [
    {
      id: "term-1",
      type: "document",
      description: "Term sheet draft",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "term-2",
      type: "activity",
      description: "Term negotiation meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "term-3",
      type: "decision",
      description: "Term sheet approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
  ],
  "11": [
    {
      id: "close-1",
      type: "document",
      description: "Final agreement",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "close-2",
      type: "activity",
      description: "Closing meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
    {
      id: "close-3",
      type: "decision",
      description: "Final approval",
      status: "pending",
      icon: <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" />,
    },
  ],
  "12": [
    {
      id: "decline-1",
      type: "document",
      description: "Decline rationale",
      status: "pending",
      icon: <FileText className="gba:h-4 gba:w-4 gba:text-orange-500" />,
    },
    {
      id: "decline-2",
      type: "activity",
      description: "Debrief meeting",
      status: "pending",
      icon: <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />,
    },
  ],
}

const sampleStages: Stage[] = [
  { 
    id: "stage-1", 
    pipelineId: "pipeline-1",
    name: "Qualification", 
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "stage-2", 
    pipelineId: "pipeline-1",
    name: "Meeting", 
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "stage-3", 
    pipelineId: "pipeline-1",
    name: "Proposal", 
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "stage-4", 
    pipelineId: "pipeline-1",
    name: "Negotiation", 
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "stage-5", 
    pipelineId: "pipeline-1",
    name: "Closed Won", 
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleOpportunity: DetailedOpportunity = {
  id: "sample-1",
  name: "Enterprise Software Solution",
  companyName: "Acme Corporation",
  value: "75000",
  currency: "USD",
  pipelineName: "Enterprise Sales",
  stageName: "Negotiation",
  stageId: "stage-3",
  type: "incoming",
  contacts: [],
  activities: [],
  documents: [],
  decisions: [],
  tasks: [],
  description: "Enterprise-wide software implementation for streamlining operations.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

interface SampleStageRequirement extends Omit<StageRequirement, 'createdAt'> {
  stageId: string
  status?: 'completed' | 'pending' | 'failed'
}

const sampleRequirements: SampleStageRequirement[] = [
  {
    id: "req-1",
    stageId: "1",
    type: "document",
    description: "Proposal document",
    status: "completed"
  },
  {
    id: "req-2",
    stageId: "1",
    type: "document",
    description: "Follow-up meeting",
    status: "pending"
  }
];

export default function StageProgressionBar({
  opportunity = sampleOpportunity,
  stages = sampleStages,
  nextStageRequirements = sampleRequirements,
  onStageChange,
}: StageProgressionBarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [hoveredStage, setHoveredStage] = useState<Stage | null>(null)

  // Debug logging
  console.log("StageProgressionBar - Opportunity:", opportunity)
  console.log("StageProgressionBar - Stages:", stages)
  console.log("StageProgressionBar - Next Stage Requirements:", nextStageRequirements)

  const currentStageIndex = stages.findIndex((stage) => stage.id === opportunity.stageId)
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null

  const handleStageClick = (stage: Stage) => {
    if (stage.id === opportunity.stageId) return

    const stageIndex = stages.findIndex((s) => s.id === stage.id)
    if (stageIndex > currentStageIndex + 1) return

    setSelectedStage(stage)
    setIsDialogOpen(true)
  }

  const handleStageChange = () => {
    if (selectedStage && onStageChange) {
      onStageChange(selectedStage.id)
    }
    setIsDialogOpen(false)
  }

  const canMoveToNextStage = nextStage
    ? checkAllRequirementsMet(
        nextStageRequirements,
        opportunity.tasks || [],
        opportunity.documents || [],
        opportunity.decisions || [],
      )
    : false

  const getStageRequirements = (stageId: string) => {
    return demoStageRequirements[stageId as keyof typeof demoStageRequirements] || []
  }

  const getStageCompletionPercentage = (stageId: string) => {
    const requirements = getStageRequirements(stageId)
    if (requirements.length === 0) return 100

    const completedCount = requirements.filter((req) => req.status === "completed").length
    return Math.round((completedCount / requirements.length) * 100)
  }

  if (!stages || stages.length === 0) {
    return (
      <div className="gba:p-4 gba:border gba:rounded-md gba:bg-gray-50">
        <p className="gba:text-sm gba:text-gray-500">No pipeline stages defined.</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      <h3 className="gba:text-sm gba:font-medium">Stage Progression</h3>

      <div className="gba:flex gba:flex-col gba:space-y-2">
        <div className="gba:flex gba:w-full gba:items-center">
          {stages.map((stage, index) => {
            const isCurrentStage = stage.id === opportunity.stageId
            const isPastStage = index < currentStageIndex
            const isFutureStage = index > currentStageIndex
            const isNextStage = index === currentStageIndex + 1
            const isClickable = isPastStage || (isNextStage && canMoveToNextStage)
            const completionPercentage = getStageCompletionPercentage(stage.id)

            const flexBasis = `${100 / stages.length}%`

            return (
              <div
                key={stage.id}
                className="gba:flex gba:flex-1 gba:items-center gba:relative"
                style={{ flexBasis }}
                onMouseEnter={() => setHoveredStage(stage)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <button
                  type="button"
                  className={`flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                    isCurrentStage
                      ? `${getStageColorClass(stage.color || "gray")} border-2`
                      : isPastStage
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : isClickable
                          ? "border-dashed border-muted-foreground bg-background text-muted-foreground hover:bg-muted/50"
                          : "border-dashed border-muted-foreground bg-background text-muted-foreground opacity-50"
                  } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                  onClick={() => isClickable && handleStageClick(stage)}
                  disabled={!isClickable}
                >
                  {isPastStage && <CheckCircle2 className="gba:mr-1 gba:h-3 gba:w-3" />}
                  {stage.name}
                </button>
                {index < stages.length - 1 && <div className="gba:flex-1 gba:h-0.5 gba:mx-1 gba:bg-gray-200"></div>}

                {hoveredStage && hoveredStage.id === stage.id && (
                  <div className="gba:absolute gba:top-full gba:left-0 gba:mt-2 gba:z-50 gba:w-80 gba:bg-white gba:rounded-md gba:shadow-lg gba:border gba:p-4">
                    <div className="gba:flex gba:justify-between gba:items-center gba:mb-3">
                      <h4 className="gba:font-medium gba:text-sm">{stage.name} Requirements</h4>
                      <span className="gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded-full gba:bg-gray-100">
                        {completionPercentage}% Complete
                      </span>
                    </div>

                    <div className="gba:w-full gba:h-1.5 gba:bg-gray-100 gba:rounded-full gba:mb-3">
                      <div
                        className="gba:h-full gba:bg-green-500 gba:rounded-full"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>

                    <div className="gba:space-y-3">
                      <div className="gba:space-y-1">
                        <h5 className="gba:text-xs gba:font-medium gba:text-orange-600 gba:flex gba:items-center">
                          <FileText className="gba:h-3.5 gba:w-3.5 gba:mr-1" /> Required Documents
                        </h5>
                        <div className="gba:space-y-1.5">
                          {getStageRequirements(stage.id)
                            .filter((req) => req.type === "document")
                            .map((req) => (
                              <div key={req.id} className="gba:flex gba:items-start gba:gap-2">
                                {req.status === "completed" ? (
                                  <CheckCircle2 className="gba:h-3.5 gba:w-3.5 gba:text-green-500 gba:mt-0.5" />
                                ) : (
                                  <AlertCircle className="gba:h-3.5 gba:w-3.5 gba:text-amber-500 gba:mt-0.5" />
                                )}
                                <span className="gba:text-xs">{req.description}</span>
                              </div>
                            ))}
                          {getStageRequirements(stage.id).filter((req) => req.type === "document").length === 0 && (
                            <span className="gba:text-xs gba:text-gray-500">No document requirements</span>
                          )}
                        </div>
                      </div>

                      <div className="gba:space-y-1">
                        <h5 className="gba:text-xs gba:font-medium gba:text-blue-600 gba:flex gba:items-center">
                          <Calendar className="gba:h-3.5 gba:w-3.5 gba:mr-1" /> Required Activities
                        </h5>
                        <div className="gba:space-y-1.5">
                          {getStageRequirements(stage.id)
                            .filter((req) => req.type === "activity")
                            .map((req) => (
                              <div key={req.id} className="gba:flex gba:items-start gba:gap-2">
                                {req.status === "completed" ? (
                                  <CheckCircle2 className="gba:h-3.5 gba:w-3.5 gba:text-green-500 gba:mt-0.5" />
                                ) : (
                                  <AlertCircle className="gba:h-3.5 gba:w-3.5 gba:text-amber-500 gba:mt-0.5" />
                                )}
                                <span className="gba:text-xs">{req.description}</span>
                              </div>
                            ))}
                          {getStageRequirements(stage.id).filter((req) => req.type === "activity").length === 0 && (
                            <span className="gba:text-xs gba:text-gray-500">No activity requirements</span>
                          )}
                        </div>
                      </div>

                      <div className="gba:space-y-1">
                        <h5 className="gba:text-xs gba:font-medium gba:text-purple-600 gba:flex gba:items-center">
                          <CheckSquare className="gba:h-3.5 gba:w-3.5 gba:mr-1" /> Required Decisions
                        </h5>
                        <div className="gba:space-y-1.5">
                          {getStageRequirements(stage.id)
                            .filter((req) => req.type === "decision")
                            .map((req) => (
                              <div key={req.id} className="gba:flex gba:items-start gba:gap-2">
                                {req.status === "completed" ? (
                                  <CheckCircle2 className="gba:h-3.5 gba:w-3.5 gba:text-green-500 gba:mt-0.5" />
                                ) : (
                                  <AlertCircle className="gba:h-3.5 gba:w-3.5 gba:text-amber-500 gba:mt-0.5" />
                                )}
                                <span className="gba:text-xs">{req.description}</span>
                              </div>
                            ))}
                          {getStageRequirements(stage.id).filter((req) => req.type === "decision").length === 0 && (
                            <span className="gba:text-xs gba:text-gray-500">No decision requirements</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isNextStage && canMoveToNextStage && (
                      <Button
                        size="sm"
                        className="gba:w-full gba:mt-4"
                        onClick={() => {
                          setSelectedStage(nextStage)
                          setIsDialogOpen(true)
                        }}
                      >
                        Advance to {stage.name}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Opportunity Stage</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the stage from "{opportunity.stageName}" to "{selectedStage?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="gba:py-4">
            {selectedStage && selectedStage.id !== opportunity.stageId && (
              <div className="gba:rounded-md gba:bg-muted gba:p-4">
                <h4 className="gba:mb-2 gba:font-medium">{selectedStage.name}</h4>
                <p className="gba:text-sm gba:text-muted-foreground">{selectedStage.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStageChange}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
