"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { getStageColorClass } from "./lib/stage-requirements"
import type { DetailedOpportunity, Stage } from "./lib/db-actions"

interface OpportunityPipelineVisualizationProps {
  opportunity?: DetailedOpportunity
  stages?: Stage[]
  onStageClick?: (stageId: string) => void
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
  stageId: "stage-4",
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

export default function OpportunityPipelineVisualization({
  opportunity = sampleOpportunity,
  stages = sampleStages,
  onStageClick,
}: OpportunityPipelineVisualizationProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)

  const currentStageIndex = stages.findIndex((stage) => stage.id === opportunity.stageId)

  if (!stages || stages.length === 0) {
    return (
      <div className="gba-p-4 gba-border gba-rounded-md gba-bg-gray-50">
        <p className="gba-text-sm gba-text-gray-500">No pipeline stages defined.</p>
      </div>
    )
  }

  return (
    <div className="gba-relative">
      <div className="gba-absolute gba-top-1/2 gba-left-0 gba-right-0 gba-h-2 gba-bg-gray-200 -translate-y-1/2 gba-rounded-full"></div>

      <div
        className="gba-absolute gba-top-1/2 gba-left-0 gba-h-2 gba-bg-blue-500 -translate-y-1/2 gba-rounded-full gba-transition-all gba-duration-500"
        style={{
          width: `${currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 100 : 0}%`,
        }}
      ></div>

      <div className="gba-relative gba-flex gba-justify-between gba-items-center gba-py-8">
        {stages.map((stage, index) => {
          const isPastStage = index < currentStageIndex
          const isCurrentStage = index === currentStageIndex
          const isFutureStage = index > currentStageIndex
          const stageColor = stage.color || "blue"

          return (
            <div
              key={stage.id}
              className="gba-relative gba-flex gba-flex-col gba-items-center group"
              onMouseEnter={() => setHoveredStage(stage.id)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              <button
                type="button"
                onClick={() => onStageClick && onStageClick(stage.id)}
                className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 
                  transition-all duration-200 cursor-pointer
                  ${
                    isCurrentStage
                      ? `${getStageColorClass(stageColor)} border-2 border-blue-600`
                      : isPastStage
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-gray-300 text-gray-400"
                  }
                `}
                aria-label={`Stage ${index + 1}: ${stage.name}`}
              >
                {isPastStage ? (
                  <CheckCircle2 className="gba-h-5 gba-w-5 gba-text-white" />
                ) : (
                  <span className="gba-text-sm gba-font-medium">{index + 1}</span>
                )}
              </button>

              <div
                className={` gba-mt-2 gba-text-xs gba-font-medium gba-whitespace-nowrap gba-max-w-[100px] gba-text-center ${isCurrentStage ? "gba-text-blue-600 gba-font-semibold" : isPastStage          ? "gba-text-gray-600" : "gba-text-gray-400"} `}
              >
                {stage.name}
              </div>

              <div
                className={` gba-absolute gba-top-full gba-mt-2 gba-z-50 gba-w-48 gba-bg-white gba-rounded-md gba-shadow-lg gba-border gba-p-3 gba-text-xs gba-transition-opacity gba-duration-200 ${hoveredStage === stage.id          ? "gba-opacity-100" : "gba-opacity-0 gba-pointer-events-none"} `}
              >
                <p className="gba-font-medium gba-text-sm">{stage.name}</p>
                {stage.description && <p className="gba-text-gray-500 gba-mt-1">{stage.description}</p>}
                <div className="gba-mt-2 gba-text-gray-500">
                  {isCurrentStage && <span className="gba-text-blue-600 gba-font-medium">Current stage</span>}
                  {isPastStage && <span className="gba-text-green-600 gba-font-medium">Completed</span>}
                  {isFutureStage && <span className="gba-text-gray-600 gba-font-medium">Upcoming stage</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
