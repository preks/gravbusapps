export interface Activity {
  id: number
  type: "call" | "email" | "meeting" | "note"
  title: string
  description: string
  date: string
  user: {
    name: string
    avatar: string
    initials: string
  }
}

export interface Document {
  id: number
  name: string
  type: string
  size: string
  uploadedBy: string
  uploadedAt: string
  url: string
}

export interface Decision {
  id: number
  title: string
  description: string
  status: "pending" | "approved" | "rejected"
  date: string
  decisionMaker: string
  notes?: string
}

export interface DetailedOpportunity {
  id: number
  name: string
  company: string
  companyId: number
  value: string
  stage: string
  stageId: string
  opportunityType: string
  opportunityTypeId: string
  probability: string
  expectedCloseDate: string
  owner: string
  description: string
  contacts: Array<{
    id: number
    name: string
    position: string
    email: string
    phone: string
  }>
  activities: Activity[]
  documents: Document[]
  decisions: Decision[]
  createdAt: string
  updatedAt: string
}

