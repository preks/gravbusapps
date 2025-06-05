"use client"

import { useState } from "react"
import { Button } from "../common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Input } from "../common/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../common/ui/table"
import { Download, FileText, Plus, Search } from "lucide-react"
import type { Document, StageRequirement } from "../lib/db-actions"

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
    return <FileText className="gba-h-4 gba-w-4" />
  }

  return (
    <Card>
      <CardHeader className="gba-flex gba-flex-row gba-items-center gba-justify-between">
        <CardTitle>Documents</CardTitle>
        <Button size="sm">
          <Plus className="gba-mr-2 gba-h-4 gba-w-4" />
          Upload Document
        </Button>
      </CardHeader>
      <CardContent>
        <div className="gba-mb-4 gba-flex gba-flex-col gba-gap-2 gba-sm:flex-row">
          <div className="gba-relative gba-flex-1">
            <Search className="gba-absolute gba-left-2.5 gba-top-2.5 gba-h-4 gba-w-4 gba-text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="gba-pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="gba-py-12 gba-text-center gba-text-muted-foreground">
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
                <TableHead className="gba-w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="gba-flex gba-items-center gba-gap-2">
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
                        <Download className="gba-h-4 gba-w-4" />
                        <span className="gba-sr-only">Download</span>
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
