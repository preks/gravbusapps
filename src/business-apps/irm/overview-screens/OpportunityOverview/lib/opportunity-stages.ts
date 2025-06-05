
export type StageRequirementType = "document" | "activity" | "decision"

export interface StageRequirement {
  id: string
  type: StageRequirementType
  description: string
  documentTypes?: string[]
  activityTypes?: string[]
  decisionStatus?: "approved" | "any"
}

export interface OpportunityStage {
  id: string
  name: string
  description: string
  color: string
  order: number
  requirements?: StageRequirement[]
}

export interface OpportunityType {
  id: string
  name: string
  description: string
  stages: OpportunityStage[]
}

export const opportunityTypes: OpportunityType[] = [
  {
    id: "software-implementation",
    name: "Software Implementation",
    description: "For software implementation and integration projects",
    stages: [
      {
        id: "discovery",
        name: "Discovery",
        description: "Initial requirements gathering and scoping",
        color: "blue",
        order: 1,
        requirements: [],
      },
      {
        id: "qualified",
        name: "Qualified",
        description: "Opportunity has been qualified as a good fit",
        color: "indigo",
        order: 2,
        requirements: [
          {
            id: "req-1",
            type: "activity",
            description: "Complete initial discovery call",
            activityTypes: ["call", "meeting"],
          },
          {
            id: "req-2",
            type: "document",
            description: "Requirements document created",
            documentTypes: ["DOCX", "PDF"],
          },
        ],
      },
      {
        id: "proposal",
        name: "Proposal",
        description: "Proposal has been created and sent",
        color: "violet",
        order: 3,
        requirements: [
          {
            id: "req-3",
            type: "document",
            description: "Proposal document created and shared",
            documentTypes: ["PDF"],
          },
          {
            id: "req-4",
            type: "activity",
            description: "Solution presentation meeting",
            activityTypes: ["meeting"],
          },
        ],
      },
      {
        id: "negotiation",
        name: "Negotiation",
        description: "Terms are being negotiated",
        color: "purple",
        order: 4,
        requirements: [
          {
            id: "req-5",
            type: "decision",
            description: "Proposal approach approved by client",
            decisionStatus: "approved",
          },
        ],
      },
      {
        id: "closed-won",
        name: "Closed Won",
        description: "Deal has been won",
        color: "green",
        order: 5,
        requirements: [
          {
            id: "req-6",
            type: "document",
            description: "Signed contract received",
            documentTypes: ["PDF"],
          },
          {
            id: "req-7",
            type: "decision",
            description: "Final approval from management",
            decisionStatus: "approved",
          },
        ],
      },
      {
        id: "closed-lost",
        name: "Closed Lost",
        description: "Deal has been lost",
        color: "red",
        order: 6,
        requirements: [],
      },
    ],
  },
  {
    id: "consulting-services",
    name: "Consulting Services",
    description: "For professional consulting service engagements",
    stages: [
      {
        id: "lead",
        name: "Lead",
        description: "Initial contact and interest",
        color: "blue",
        order: 1,
        requirements: [],
      },
      {
        id: "needs-analysis",
        name: "Needs Analysis",
        description: "Analyzing client needs and requirements",
        color: "indigo",
        order: 2,
        requirements: [
          {
            id: "req-8",
            type: "activity",
            description: "Initial consultation meeting",
            activityTypes: ["meeting"],
          },
        ],
      },
      {
        id: "solution-design",
        name: "Solution Design",
        description: "Designing the consulting solution",
        color: "violet",
        order: 3,
        requirements: [
          {
            id: "req-9",
            type: "document",
            description: "Needs assessment document",
            documentTypes: ["PDF", "DOCX"],
          },
          {
            id: "req-10",
            type: "decision",
            description: "Scope approval by client",
            decisionStatus: "approved",
          },
        ],
      },
      {
        id: "proposal",
        name: "Proposal",
        description: "Formal proposal presented",
        color: "purple",
        order: 4,
        requirements: [
          {
            id: "req-11",
            type: "document",
            description: "Consulting proposal document",
            documentTypes: ["PDF"],
          },
          {
            id: "req-12",
            type: "activity",
            description: "Proposal presentation meeting",
            activityTypes: ["meeting"],
          },
        ],
      },
      {
        id: "closed-won",
        name: "Closed Won",
        description: "Consulting engagement secured",
        color: "green",
        order: 5,
        requirements: [
          {
            id: "req-13",
            type: "document",
            description: "Signed service agreement",
            documentTypes: ["PDF"],
          },
        ],
      },
      {
        id: "closed-lost",
        name: "Closed Lost",
        description: "Opportunity lost",
        color: "red",
        order: 6,
        requirements: [],
      },
    ],
  },
]

export function checkRequirementStatus(
  requirement: StageRequirement,
  activities: any[],
  documents: any[],
  decisions: any[],
): boolean {
  switch (requirement.type) {
    case "activity":
      if (!requirement.activityTypes || requirement.activityTypes.length === 0) return true
      return activities.some((activity) => requirement.activityTypes?.includes(activity.type))

    case "document":
      if (!requirement.documentTypes || requirement.documentTypes.length === 0) return true
      return documents.some((document) => requirement.documentTypes?.includes(document.type))

    case "decision":
      if (requirement.decisionStatus === "approved") {
        return decisions.some((decision) => decision.status === "approved")
      }
      return decisions.length > 0

    default:
      return false
  }
}

export function checkAllRequirementsMet(
  stageRequirements: StageRequirement[],
  activities: any[],
  documents: any[],
  decisions: any[],
): boolean {
  if (!stageRequirements || stageRequirements.length === 0) return true

  return stageRequirements.every((requirement) => checkRequirementStatus(requirement, activities, documents, decisions))
}

export function getStageColorClass(color: string): string {
  switch (color) {
    case "blue":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "indigo":
      return "bg-indigo-100 text-indigo-800 border-indigo-300"
    case "violet":
      return "bg-violet-100 text-violet-800 border-violet-300"
    case "purple":
      return "bg-purple-100 text-purple-800 border-purple-300"
    case "green":
      return "bg-green-100 text-green-800 border-green-300"
    case "red":
      return "bg-red-100 text-red-800 border-red-300"
    case "yellow":
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "orange":
      return "bg-orange-100 text-orange-800 border-orange-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

export function getStageBgColorClass(color: string): string {
  switch (color) {
    case "blue":
      return "bg-blue-500"
    case "indigo":
      return "bg-indigo-500"
    case "violet":
      return "bg-violet-500"
    case "purple":
      return "bg-purple-500"
    case "green":
      return "bg-green-500"
    case "red":
      return "bg-red-500"
    case "yellow":
      return "bg-yellow-500"
    case "orange":
      return "bg-orange-500"
    default:
      return "bg-gray-500"
  }
}
