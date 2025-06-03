"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { getStageColorClass } from "../../../../common/lib/stage-requirements"
import type { DetailedOpportunity, Stage } from "../../../../common/lib/db-actions"

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
      <div className="p-4 border rounded-md bg-gray-50">
        <p className="text-sm text-gray-500">No pipeline stages defined.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 -translate-y-1/2 rounded-full"></div>

      <div
        className="absolute top-1/2 left-0 h-2 bg-blue-500 -translate-y-1/2 rounded-full transition-all duration-500"
        style={{
          width: `${currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 100 : 0}%`,
        }}
      ></div>

      <div className="relative flex justify-between items-center py-8">
        {stages.map((stage, index) => {
          const isPastStage = index < currentStageIndex
          const isCurrentStage = index === currentStageIndex
          const isFutureStage = index > currentStageIndex
          const stageColor = stage.color || "blue"

          return (
            <div
              key={stage.id}
              className="relative flex flex-col items-center group"
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
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>

              <div
                className={`
                mt-2 text-xs font-medium whitespace-nowrap max-w-[100px] text-center
                ${isCurrentStage ? "text-blue-600 font-semibold" : isPastStage ? "text-gray-600" : "text-gray-400"}
              `}
              >
                {stage.name}
              </div>

              <div
                className={`
                absolute top-full mt-2 z-50 w-48 bg-white rounded-md shadow-lg border p-3 text-xs
                transition-opacity duration-200
                ${hoveredStage === stage.id ? "opacity-100" : "opacity-0 pointer-events-none"}
              `}
              >
                <p className="font-medium text-sm">{stage.name}</p>
                {stage.description && <p className="text-gray-500 mt-1">{stage.description}</p>}
                <div className="mt-2 text-gray-500">
                  {isCurrentStage && <span className="text-blue-600 font-medium">Current stage</span>}
                  {isPastStage && <span className="text-green-600 font-medium">Completed</span>}
                  {isFutureStage && <span className="text-gray-600 font-medium">Upcoming stage</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
