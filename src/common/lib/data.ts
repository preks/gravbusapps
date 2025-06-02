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

const opportunities = [
  {
    id: 1,
    name: "Software Implementation Project",
    company: "Acme Corporation",
    companyId: 1,
    value: "$75,000",
    stage: "Proposal",
    stageId: "proposal",
    opportunityType: "Software Implementation",
    opportunityTypeId: "software-implementation",
    probability: "60%",
    expectedCloseDate: "2023-06-15",
    owner: "Alex Johnson",
    description:
      "Implementation of our enterprise software solution for Acme Corporation's marketing department. The project includes software customization, data migration, and user training.",
    contacts: [
      {
        id: 1,
        name: "John Smith",
        position: "CTO",
        email: "john.smith@acmecorp.com",
        phone: "+1 (555) 123-4567",
      },
      {
        id: 2,
        name: "Sarah Johnson",
        position: "Marketing Director",
        email: "sarah.johnson@acmecorp.com",
        phone: "+1 (555) 234-5678",
      },
    ],
    activities: [
      {
        id: 1,
        type: "call",
        title: "Initial discovery call",
        description: "Discussed client requirements and potential solutions",
        date: "2023-04-10T14:30:00",
        user: {
          name: "Alex Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "AJ",
        },
      },
      {
        id: 2,
        type: "meeting",
        title: "Solution presentation",
        description: "Presented our software solution to the client's team",
        date: "2023-04-20T10:00:00",
        user: {
          name: "Alex Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "AJ",
        },
      },
      {
        id: 3,
        type: "email",
        title: "Sent proposal draft",
        description: "Sent the initial proposal draft for client review",
        date: "2023-04-25T09:15:00",
        user: {
          name: "Emily Davis",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "ED",
        },
      },
      {
        id: 4,
        type: "note",
        title: "Client feedback",
        description: "Client requested additional information about implementation timeline",
        date: "2023-04-27T16:45:00",
        user: {
          name: "Alex Johnson",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "AJ",
        },
      },
    ],
    documents: [
      {
        id: 1,
        name: "Project Proposal.pdf",
        type: "PDF",
        size: "2.4 MB",
        uploadedBy: "Alex Johnson",
        uploadedAt: "2023-04-25T09:15:00",
        url: "#",
      },
      {
        id: 2,
        name: "Requirements Specification.docx",
        type: "DOCX",
        size: "1.8 MB",
        uploadedBy: "Emily Davis",
        uploadedAt: "2023-04-15T11:30:00",
        url: "#",
      },
      {
        id: 3,
        name: "Implementation Timeline.xlsx",
        type: "XLSX",
        size: "950 KB",
        uploadedBy: "Alex Johnson",
        uploadedAt: "2023-04-28T14:20:00",
        url: "#",
      },
    ],
    decisions: [
      {
        id: 1,
        title: "Solution Approach",
        description: "Decision on whether to use standard or custom implementation approach",
        status: "approved",
        date: "2023-04-22T15:00:00",
        decisionMaker: "John Smith",
        notes: "Approved custom implementation approach due to specific requirements",
      },
      {
        id: 2,
        title: "Budget Approval",
        description: "Internal approval for project budget",
        status: "approved",
        date: "2023-04-18T11:30:00",
        decisionMaker: "Michael Brown",
        notes: "Budget approved by finance department",
      },
      {
        id: 3,
        title: "Timeline Extension",
        description: "Request to extend implementation timeline by 2 weeks",
        status: "pending",
        date: "2023-05-02T09:45:00",
        decisionMaker: "Sarah Johnson",
        notes: "Awaiting client approval on revised timeline",
      },
    ],
    createdAt: "2023-04-05T08:30:00",
    updatedAt: "2023-05-02T16:45:00",
  },
  {
    id: 2,
    name: "Cloud Migration Deal",
    company: "Tech Solutions Inc.",
    companyId: 2,
    value: "$120,000",
    stage: "Negotiation",
    stageId: "negotiation",
    opportunityType: "Software Implementation",
    opportunityTypeId: "software-implementation",
    probability: "80%",
    expectedCloseDate: "2023-05-30",
    owner: "Sarah Williams",
    description:
      "Migration of Tech Solutions' on-premise infrastructure to our cloud platform. Includes server migration, data transfer, and ongoing managed services.",
    contacts: [
      {
        id: 3,
        name: "David Wilson",
        position: "IT Director",
        email: "david.wilson@techsolutions.com",
        phone: "+1 (555) 345-6789",
      },
      {
        id: 4,
        name: "Jennifer Lee",
        position: "CEO",
        email: "jennifer.lee@techsolutions.com",
        phone: "+1 (555) 456-7890",
      },
    ],
    activities: [
      {
        id: 5,
        type: "meeting",
        title: "Initial consultation",
        description: "Met with IT team to discuss migration requirements",
        date: "2023-03-15T13:00:00",
        user: {
          name: "Sarah Williams",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "SW",
        },
      },
      {
        id: 6,
        type: "call",
        title: "Technical assessment call",
        description: "Detailed discussion about current infrastructure",
        date: "2023-03-22T11:00:00",
        user: {
          name: "Michael Brown",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "MB",
        },
      },
      {
        id: 7,
        type: "email",
        title: "Sent migration proposal",
        description: "Detailed migration plan and pricing",
        date: "2023-04-05T10:30:00",
        user: {
          name: "Sarah Williams",
          avatar: "/placeholder.svg?height=32&width=32",
          initials: "SW",
        },
      },
    ],
    documents: [
      {
        id: 4,
        name: "Migration Proposal.pdf",
        type: "PDF",
        size: "3.2 MB",
        uploadedBy: "Sarah Williams",
        uploadedAt: "2023-04-05T10:30:00",
        url: "#",
      },
      {
        id: 5,
        name: "Technical Assessment.docx",
        type: "DOCX",
        size: "1.5 MB",
        uploadedBy: "Michael Brown",
        uploadedAt: "2023-03-25T09:45:00",
        url: "#",
      },
      {
        id: 6,
        name: "Service Level Agreement.pdf",
        type: "PDF",
        size: "1.1 MB",
        uploadedBy: "Sarah Williams",
        uploadedAt: "2023-04-10T14:15:00",
        url: "#",
      },
    ],
    decisions: [
      {
        id: 4,
        title: "Migration Approach",
        description: "Decision on phased vs. all-at-once migration approach",
        status: "approved",
        date: "2023-04-01T14:30:00",
        decisionMaker: "David Wilson",
        notes: "Approved phased migration approach to minimize disruption",
      },
      {
        id: 5,
        title: "Managed Services Package",
        description: "Selection of ongoing managed services tier",
        status: "approved",
        date: "2023-04-12T10:00:00",
        decisionMaker: "Jennifer Lee",
        notes: "Selected premium tier with 24/7 support",
      },
      {
        id: 6,
        title: "Contract Length",
        description: "Decision on 1-year vs. 3-year contract term",
        status: "pending",
        date: "2023-04-20T15:45:00",
        decisionMaker: "Jennifer Lee",
        notes: "Still discussing financial implications of longer term",
      },
    ],
    createdAt: "2023-03-10T09:15:00",
    updatedAt: "2023-04-20T16:30:00",
  },
]

