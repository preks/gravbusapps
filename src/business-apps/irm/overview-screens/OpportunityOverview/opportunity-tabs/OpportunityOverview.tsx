import { Avatar, AvatarFallback, AvatarImage } from "../common/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Progress } from "../common/ui/progress"
import type { DetailedOpportunity } from "../lib/db-actions"

interface OpportunityOverviewProps {
  opportunity: DetailedOpportunity
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
  probability: "65%",
  contacts: [
    {
      id: "contact-1",
      name: "John Smith",
      position: "CTO",
      email: "john.smith@acme.example",
      phone: "+1 (555) 123-4567"
    }
  ],
  description: "Enterprise-wide software implementation for streamlining operations.",
  expectedCloseDate: "2025-09-30",
  ownerId: "Sarah Johnson",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activities: [
    {
      id: "activity-1",
      opportunityId: "sample-1",
      type: "meeting",
      title: "Initial consultation",
      description: "Discussed requirements and potential solutions",
      date: "2025-05-15",
      user: {
        name: "Sarah Johnson",
        avatar: "/avatar-placeholder.png",
        initials: "SJ"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  documents: [
    {
      id: "doc-1",
      opportunityId: "sample-1",
      name: "Proposal.pdf",
      type: "application/pdf",
      size: "1.2 MB",
      url: "/documents/proposal.pdf",
      uploadedBy: "Sarah Johnson",
      uploadedAt: "2025-05-18",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  decisions: [
    {
      id: "decision-1",
      opportunityId: "sample-1",
      title: "Budget Approval",
      status: "pending",
      date: "2025-06-10",
      decisionMaker: "Finance Committee",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: "task-1",
      opportunityId: "sample-1",
      title: "Prepare technical demonstration",
      status: "in_progress",
      dueDate: "2025-06-05",
      assignedTo: "Technical Team",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

export function OpportunityOverview({ opportunity = sampleOpportunity }: OpportunityOverviewProps) {
  const probabilityValue = opportunity?.probability ? Number.parseInt(opportunity.probability.replace("%", "")) : 0

  return (
    <div className="gba-grid gba-gap-6 gba-md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{opportunity.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba-space-y-4">
            {opportunity.contacts.map((contact) => (
              <div key={contact.id} className="gba-flex gba-items-start gba-space-x-4">
                <Avatar>
                  <AvatarImage src={`/generic-placeholder-graphic.png?height=40&width=40`} />
                  <AvatarFallback>
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="gba-font-medium">{contact.name}</h4>
                  <p className="gba-text-sm gba-text-muted-foreground">{contact.position}</p>
                  <div className="gba-mt-1 gba-text-sm">
                    <div>{contact.email}</div>
                    <div>{contact.phone}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba-space-y-4">
            <div>
              <div className="gba-mb-1 gba-text-sm gba-font-medium">Value</div>
              <div>{opportunity.value}</div>
            </div>
            <div>
              <div className="gba-mb-1 gba-text-sm gba-font-medium">Expected Close Date</div>
              <div>{opportunity.expectedCloseDate}</div>
            </div>
            <div>
              <div className="gba-mb-1 gba-text-sm gba-font-medium">Owner</div>
              <div>{opportunity.ownerId}</div>
            </div>
            <div>
              <div className="gba-mb-1 gba-text-sm gba-font-medium">Created</div>
              <div>{opportunity?.createdAt ? new Date(opportunity.createdAt as string).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div>
              <div className="gba-mb-1 gba-text-sm gba-font-medium">Last Updated</div>
              <div>{opportunity?.updatedAt ? new Date(opportunity.updatedAt as string).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Probability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba-space-y-4">
            <div className="gba-text-center gba-text-3xl gba-font-bold">{opportunity.probability}</div>
            <Progress value={probabilityValue} className="gba-h-2" />
            <div className="gba-grid gba-grid-cols-3 gba-text-center gba-text-sm">
              <div>Low</div>
              <div>Medium</div>
              <div>High</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
