/**
 * Related Cases Panel Component
 *
 * Panel for linking cases (parent, children, related peer cases)
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Link2, X, FolderTree, GitBranch, Plus, ExternalLink } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { LinkedCase } from '../types'
import { useCaseSearch } from '../hooks'

interface RelatedCasesPanelProps {
  caseId: string
  linkedCases: LinkedCase[]
  parentCaseId?: string | null
  onLinkCase: (targetCaseId: string, relationship: 'parent' | 'child' | 'related') => Promise<void>
  onUnlinkCase: (targetCaseId: string) => Promise<void>
  onNavigateToCase: (caseId: string) => void
  context: BusinessAppContextProps
  tags?: Record<string, string>
  readOnly?: boolean
}

export const RelatedCasesPanel: React.FC<RelatedCasesPanelProps> = ({
  caseId,
  linkedCases,
  onLinkCase,
  onUnlinkCase,
  onNavigateToCase,
  context,
  tags,
  readOnly = false
}) => {
  const { searchResults, isSearching, searchCases, clearResults } = useCaseSearch({
    context,
    currentCaseId: caseId,
    linkedCases,
    tags
  })

  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [selectedRelationship, setSelectedRelationship] = useState<'parent' | 'child' | 'related'>('related')
  const [isLinking, setIsLinking] = useState(false)

  // Categorize linked cases
  const parentCase = linkedCases.find(c => c.relationship === 'parent')
  const childCases = linkedCases.filter(c => c.relationship === 'child')
  const relatedCases = linkedCases.filter(c => c.relationship === 'related')

  // Check if parent link is available (can only have one parent)
  const canLinkAsParent = !parentCase

  // Handle search input change
  const handleSearch = (query: string) => {
    searchCases(query)
  }

  // Handle case selection from combobox
  const handleSelectCase = (caseIdValue: string) => {
    setSelectedCaseId(caseIdValue)
  }

  // Handle relationship change
  const handleRelationshipChange = (value: string) => {
    setSelectedRelationship(value as 'parent' | 'child' | 'related')
  }

  // Handle link button click
  const handleLinkCase = async () => {
    if (!selectedCaseId) return

    // Validate parent relationship
    if (selectedRelationship === 'parent' && !canLinkAsParent) {
      console.warn('Cannot link as parent - case already has a parent')
      return
    }

    try {
      setIsLinking(true)
      await onLinkCase(selectedCaseId, selectedRelationship)
      setSelectedCaseId('')
      clearResults()
    } catch (error) {
      console.error('Failed to link case:', error)
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkCase = async (targetCaseId: string) => {
    try {
      await onUnlinkCase(targetCaseId)
    } catch (error) {
      console.error('Failed to unlink case:', error)
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'open':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'outline'
      case 'blocked':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  // Get relationship icon
  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'parent':
        return <FolderTree className="gba:h-4 gba:w-4" />
      case 'child':
        return <GitBranch className="gba:h-4 gba:w-4" />
      case 'related':
        return <Link2 className="gba:h-4 gba:w-4" />
      default:
        return <Link2 className="gba:h-4 gba:w-4" />
    }
  }

  // Get options for combobox
  const comboboxOptions = searchResults.map(result => ({
    value: result.caseId,
    label: `${result.title} (${result.status})`
  }))

  // Render a linked case card
  const renderCaseCard = (linkedCase: LinkedCase) => (
    <div
      key={linkedCase.caseId}
      className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30 hover:gba:bg-muted/50 gba:transition-colors"
    >
      <div
        className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:cursor-pointer"
        onClick={() => onNavigateToCase(linkedCase.caseId)}
      >
        <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-full gba:bg-background gba:border gba:shadow-sm">
          {getRelationshipIcon(linkedCase.relationship)}
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <p className="gba:font-medium gba:text-sm gba:truncate">{linkedCase.title}</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{linkedCase.caseId.slice(0, 8)}...</p>
        </div>
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Badge variant={getStatusBadgeVariant(linkedCase.status)} className="gba:text-xs">
          {linkedCase.status}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigateToCase(linkedCase.caseId)}
          className="gba:h-8 gba:w-8 gba:p-0"
          title="Open case"
        >
          <ExternalLink className="gba:h-4 gba:w-4" />
        </Button>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUnlinkCase(linkedCase.caseId)}
            className="gba:h-8 gba:w-8 gba:p-0 hover:gba:text-destructive"
            title="Unlink case"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="gba:space-y-4">
      {/* Search and Link Case */}
      {!readOnly && (
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Plus className="gba:h-4 gba:w-4" />
              Link Case
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex-1">
                  <Combobox
                    value={selectedCaseId}
                    onValueChange={handleSelectCase}
                    onSearch={handleSearch}
                    options={comboboxOptions}
                    placeholder="Search cases by title..."
                    searchPlaceholder="Type to search..."
                    emptyText="No cases found. Type at least 2 characters."
                    loading={isSearching}
                    loadingText="Searching..."
                    disabled={isLinking}
                  />
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:flex-1">
                  <Select value={selectedRelationship} onValueChange={handleRelationshipChange} disabled={isLinking}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent" disabled={!canLinkAsParent}>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FolderTree className="gba:h-4 gba:w-4" />
                          <span>Parent Case</span>
                          {!canLinkAsParent && (
                            <span className="gba:text-xs gba:text-muted-foreground">(already has parent)</span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="child">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <GitBranch className="gba:h-4 gba:w-4" />
                          <span>Child Case (Sub-case)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="related">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Link2 className="gba:h-4 gba:w-4" />
                          <span>Related Case (Peer)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleLinkCase}
                  disabled={!selectedCaseId || isLinking || (selectedRelationship === 'parent' && !canLinkAsParent)}
                  size="sm"
                >
                  {isLinking ? 'Linking...' : 'Link'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Case Section */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <FolderTree className="gba:h-4 gba:w-4" />
            Parent Case
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          {parentCase ? (
            renderCaseCard(parentCase)
          ) : (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
              <FolderTree className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
              <p className="gba:text-sm">No parent case</p>
              {!readOnly && <p className="gba:text-xs gba:mt-1">This case is not a sub-case of another case</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Child Cases Section */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <GitBranch className="gba:h-4 gba:w-4" />
            Child Cases {childCases.length > 0 && `(${childCases.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          {childCases.length === 0 ? (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
              <GitBranch className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
              <p className="gba:text-sm">No child cases</p>
              {!readOnly && <p className="gba:text-xs gba:mt-1">Link other cases as sub-cases of this case</p>}
            </div>
          ) : (
            <div className="gba:space-y-2">{childCases.map(renderCaseCard)}</div>
          )}
        </CardContent>
      </Card>

      {/* Related Cases Section */}
      <Card>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Link2 className="gba:h-4 gba:w-4" />
            Related Cases {relatedCases.length > 0 && `(${relatedCases.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0">
          {relatedCases.length === 0 ? (
            <div className="gba:text-center gba:py-6 gba:text-muted-foreground">
              <Link2 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
              <p className="gba:text-sm">No related cases</p>
              {!readOnly && <p className="gba:text-xs gba:mt-1">Link peer cases that are related to this case</p>}
            </div>
          ) : (
            <div className="gba:space-y-2">{relatedCases.map(renderCaseCard)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
