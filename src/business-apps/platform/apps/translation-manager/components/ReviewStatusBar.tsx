import React from 'react'
import { Card, CardContent, Button, Badge, Progress } from '@newwork/nw-design-system'

interface ReviewStatusBarProps {
  overallStatus: {
    totalFiles: number
    reviewedFiles: number
    needsReview: number
  }
  branchStatus: {
    touchedFiles: number
    reviewedFiles: number
    canCreatePR: boolean
  }
  onCommit: () => void
  onCreatePR: () => void
  isCommitting: boolean
  isCreatingPR: boolean
}

const ReviewStatusBar: React.FC<ReviewStatusBarProps> = ({
  overallStatus,
  branchStatus,
  onCommit,
  onCreatePR,
  isCommitting,
  isCreatingPR
}) => {
  const overallProgress =
    overallStatus.totalFiles > 0 ? (overallStatus.reviewedFiles / overallStatus.totalFiles) * 100 : 0
  const branchProgress =
    branchStatus.touchedFiles > 0 ? (branchStatus.reviewedFiles / branchStatus.touchedFiles) * 100 : 0

  return (
    <Card>
      <CardContent className="gba:py-4 gba:px-6">
        <div className="gba:flex gba:items-center gba:gap-6">
          {/* Overall Status */}
          <div className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
              <span className="gba:text-sm gba:font-medium">Overall Status:</span>
              <Badge variant={overallStatus.needsReview > 0 ? 'warning' : 'success'} className="gba:text-xs">
                {overallStatus.reviewedFiles}/{overallStatus.totalFiles} Files Reviewed
              </Badge>
              {overallStatus.needsReview > 0 && (
                <Badge variant="warning" className="gba:text-xs">
                  {overallStatus.needsReview} Need Review
                </Badge>
              )}
            </div>
            <Progress value={overallProgress} className="gba:h-2" />
          </div>

          {/* Branch Status */}
          {branchStatus.touchedFiles > 0 && (
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                <span className="gba:text-sm gba:font-medium">Branch Status:</span>
                <Badge variant={branchStatus.canCreatePR ? 'success' : 'warning'} className="gba:text-xs">
                  {branchStatus.reviewedFiles}/{branchStatus.touchedFiles} Touched Files Reviewed
                </Badge>
              </div>
              <Progress value={branchProgress} className="gba:h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="gba:flex gba:gap-2">
            <Button onClick={onCommit} disabled={isCommitting} variant="outline" size="sm">
              {isCommitting ? 'Committing...' : 'Commit'}
            </Button>
            <Button onClick={onCreatePR} disabled={!branchStatus.canCreatePR || isCreatingPR} size="sm">
              {isCreatingPR ? 'Creating PR...' : 'Create PR'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReviewStatusBar
