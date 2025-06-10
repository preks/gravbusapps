"use client"

import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Input } from "../common/ui/input"  
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../common/ui/table"
import { CheckCircle2, Clock, Plus, Search, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../common/ui/dialog"
import type { Decision, StageRequirement } from "../lib/db-actions"

interface OpportunityDecisionsProps {
  decisions: Decision[]
  opportunityId: string
  stageRequirements: StageRequirement[]
}

export function OpportunityDecisions({ decisions, opportunityId, stageRequirements }: OpportunityDecisionsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)

  const filteredDecisions = decisions.filter(
    (decision) =>
      decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (decision.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="gba-h-4 gba-w-4 gba-text-green-500" />
      case "rejected":
        return <XCircle className="gba-h-4 gba-w-4 gba-text-red-500" />
      case "pending":
        return <Clock className="gba-h-4 gba-w-4 gba-text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      case "pending":
        return "Pending"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader className="gba-flex gba-flex-row gba-items-center gba-justify-between">
        <CardTitle>Decisions</CardTitle>
        <Button size="sm">
          <Plus className="gba-mr-2 gba-h-4 gba-w-4" />
          Add Decision
        </Button>
      </CardHeader>
      <CardContent>
        <div className="gba-mb-4 gba-flex gba-flex-col gba-gap-2 gba-sm:flex-row">
          <div className="gba-relative gba-flex-1">
            <Search className="gba-absolute gba-left-2.5 gba-top-2.5 gba-h-4 gba-w-4 gba-text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search decisions..."
              className="gba-pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDecisions.length === 0 ? (
          <div className="gba-py-12 gba-text-center gba-text-muted-foreground">
            No decisions found. Try adjusting your search or add a new decision.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="gba-hidden gba-md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision Maker</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="gba-w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDecisions.map((decision) => (
                <TableRow key={decision.id}>
                  <TableCell className="gba-font-medium">{decision.title}</TableCell>
                  <TableCell className="gba-hidden gba-max-w-xs gba-truncate gba-md:table-cell">{decision.description}</TableCell>
                  <TableCell>
                    <span
                      className={`gba-inline-flex gba-items-center gba-rounded-full gba-px-2.5 gba-py-0.5 gba-text-xs gba-font-medium ${getStatusColor(
                        decision.status,
                      )}`}
                    >
                      {getStatusIcon(decision.status)}
                      <span className="gba-ml-1">{getStatusText(decision.status)}</span>
                    </span>
                  </TableCell>
                  <TableCell>{decision.decisionMaker}</TableCell>
                  <TableCell>{new Date(decision.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDecision(decision)}>
                          View
                        </Button>
                      </DialogTrigger>
                      {selectedDecision && (
                        <DialogContent className="gba-sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{selectedDecision.title}</DialogTitle>
                            <DialogDescription>Decision details and notes</DialogDescription>
                          </DialogHeader>
                          <div className="gba-grid gba-gap-4 gba-py-4">
                            <div>
                              <h4 className="gba-mb-1 gba-text-sm gba-font-medium">Description</h4>
                              <p>{selectedDecision.description}</p>
                            </div>
                            <div>
                              <h4 className="gba-mb-1 gba-text-sm gba-font-medium">Status</h4>
                              <span
                                className={`gba-inline-flex gba-items-center gba-rounded-full gba-px-2.5 gba-py-0.5 gba-text-xs gba-font-medium ${getStatusColor(
                                  selectedDecision.status,
                                )}`}
                              >
                                {getStatusIcon(selectedDecision.status)}
                                <span className="gba-ml-1">{getStatusText(selectedDecision.status)}</span>
                              </span>
                            </div>
                            <div>
                              <h4 className="gba-mb-1 gba-text-sm gba-font-medium">Decision Maker</h4>
                              <p>{selectedDecision.decisionMaker}</p>
                            </div>
                            <div>
                              <h4 className="gba-mb-1 gba-text-sm gba-font-medium">Date</h4>
                              <p>{new Date(selectedDecision.date).toLocaleDateString()}</p>
                            </div>
                            {selectedDecision.notes && (
                              <div>
                                <h4 className="gba-mb-1 gba-text-sm gba-font-medium">Notes</h4>
                                <p>{selectedDecision.notes}</p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="secondary">
                              Close
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
