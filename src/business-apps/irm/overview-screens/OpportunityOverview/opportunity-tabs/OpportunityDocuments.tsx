"use client"

import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Input } from "../common/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../common/ui/table"
import { Download, FileText, Plus, Search } from "lucide-react"
import type { Document, StageRequirement } from "../../../../../common/lib/db-actions"

interface OpportunityDocumentsProps {
  documents: Document[]
  opportunityId: string
  stageRequirements: StageRequirement[]
}

export function OpportunityDocuments({ documents, opportunityId, stageRequirements }: OpportunityDocumentsProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocuments = documents.filter(
    (document) =>
      document.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (document.type?.toLowerCase() || '').includes(searchQuery.toLowerCase()),
  )

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No documents found. Try adjusting your search or upload a new document.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDocumentIcon(document.type || '')}
                      <span>{document.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{document.type}</TableCell>
                  <TableCell>{document.size}</TableCell>
                  <TableCell>{document.uploadedBy}</TableCell>
                  <TableCell>{new Date(document.uploadedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={document.url} download>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </a>
                    </Button>
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
