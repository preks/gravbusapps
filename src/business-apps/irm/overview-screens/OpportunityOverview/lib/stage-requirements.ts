
export type StageRequirementType = "document" | "task" | "decision"

export interface StageRequirement {
  id: string
  stageId: string
  type: StageRequirementType
  description: string
  documentTypes?: string[]
  decisionStatus?: "approved" | "any"
}

export function checkRequirementStatus(
  requirement: StageRequirement,
  tasks: any[],
  documents: any[],
  decisions: any[],
): { isMet: boolean; items: any[] } {
  switch (requirement.type) {
    case "task":
      const completedTasks = tasks.filter((task) => task.status === "completed")
      return {
        isMet: completedTasks.length > 0,
        items: completedTasks,
      }

    case "document":
      if (!requirement.documentTypes || requirement.documentTypes.length === 0) {
        return { isMet: documents.length > 0, items: documents }
      }
      const matchingDocuments = documents.filter((document) => requirement.documentTypes?.includes(document.type))
      return {
        isMet: matchingDocuments.length > 0,
        items: matchingDocuments,
      }

    case "decision":
      if (requirement.decisionStatus === "approved") {
        const approvedDecisions = decisions.filter((decision) => decision.status === "approved")
        return {
          isMet: approvedDecisions.length > 0,
          items: approvedDecisions,
        }
      }
      return {
        isMet: decisions.length > 0,
        items: decisions,
      }

    default:
      return { isMet: false, items: [] }
  }
}

export function checkAllRequirementsMet(
  stageRequirements: StageRequirement[],
  tasks: any[],
  documents: any[],
  decisions: any[],
): boolean {
  if (!stageRequirements || stageRequirements.length === 0) return true

  return stageRequirements.every(
    (requirement) => checkRequirementStatus(requirement, tasks, documents, decisions).isMet,
  )
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

