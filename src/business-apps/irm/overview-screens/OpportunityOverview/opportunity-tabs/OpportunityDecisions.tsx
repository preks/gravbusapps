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
import type { Decision, StageRequirement } from "../../../../../common/lib/db-actions"

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
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Decisions</CardTitle>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Decision
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search decisions..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDecisions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No decisions found. Try adjusting your search or add a new decision.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision Maker</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDecisions.map((decision) => (
                <TableRow key={decision.id}>
                  <TableCell className="font-medium">{decision.title}</TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell">{decision.description}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        decision.status,
                      )}`}
                    >
                      {getStatusIcon(decision.status)}
                      <span className="ml-1">{getStatusText(decision.status)}</span>
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
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{selectedDecision.title}</DialogTitle>
                            <DialogDescription>Decision details and notes</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div>
                              <h4 className="mb-1 text-sm font-medium">Description</h4>
                              <p>{selectedDecision.description}</p>
                            </div>
                            <div>
                              <h4 className="mb-1 text-sm font-medium">Status</h4>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                                  selectedDecision.status,
                                )}`}
                              >
                                {getStatusIcon(selectedDecision.status)}
                                <span className="ml-1">{getStatusText(selectedDecision.status)}</span>
                              </span>
                            </div>
                            <div>
                              <h4 className="mb-1 text-sm font-medium">Decision Maker</h4>
                              <p>{selectedDecision.decisionMaker}</p>
                            </div>
                            <div>
                              <h4 className="mb-1 text-sm font-medium">Date</h4>
                              <p>{new Date(selectedDecision.date).toLocaleDateString()}</p>
                            </div>
                            {selectedDecision.notes && (
                              <div>
                                <h4 className="mb-1 text-sm font-medium">Notes</h4>
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
