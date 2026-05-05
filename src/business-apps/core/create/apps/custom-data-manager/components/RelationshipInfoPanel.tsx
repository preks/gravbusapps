import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { X, ArrowLeftRight, ArrowRight } from 'lucide-react'
import { snakeToCamelCase } from '../utils/definitionFormUtils'

export interface SelectedRelationshipData {
  sourceEntityKey: string
  sourceEntityDisplayName?: string
  targetEntityKey: string
  targetEntityDisplayName?: string
  foreignKeyColumn: string
  relationshipType: string
  joinTableName?: string
}

interface RelationshipInfoPanelProps {
  data: SelectedRelationshipData
  onClose: () => void
  onNavigateToSource?: () => void
  onNavigateToTarget?: () => void
  'data-testid'?: string
}

export const RelationshipInfoPanel: React.FC<RelationshipInfoPanelProps> = ({
  data,
  onClose,
  onNavigateToSource,
  onNavigateToTarget,
  'data-testid': testId = 'relationship-info-panel'
}) => {
  const isManyToMany = data.relationshipType === 'MANY_TO_MANY'
  const isInternal = data.relationshipType === 'INTERNAL_REF'

  const typeLabel = isManyToMany ? 'Many-to-Many' : isInternal ? 'Internal Reference' : 'One-to-Many'
  const graphqlFieldName = snakeToCamelCase(data.foreignKeyColumn)

  return (
    <div
      className="gba:h-full gba:w-[420px] gba:max-w-full gba:bg-background gba:border-l gba:border-border gba:shadow-xl gba:flex gba:flex-col gba:animate-in gba:slide-in-from-right gba:duration-200"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <ArrowLeftRight className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
          <span className="gba:font-semibold gba:text-sm gba:truncate">Relationship</span>
          <Badge
            variant={isManyToMany ? 'default' : 'secondary'}
            className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0"
          >
            {typeLabel}
          </Badge>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} data-testid={`${testId}-close`}>
          <X className="gba:h-3.5 gba:w-3.5" />
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-muted/30">
          <button
            className="gba:flex-1 gba:text-left gba:min-w-0 gba:group"
            onClick={onNavigateToSource}
            disabled={!onNavigateToSource}
          >
            <p className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wider">Source</p>
            <p className="gba:text-sm gba:font-medium gba:truncate group-hover:gba:text-primary gba:transition-colors">
              {data.sourceEntityDisplayName || data.sourceEntityKey}
            </p>
            <p className="gba:text-[10px] gba:font-mono gba:text-muted-foreground gba:truncate">
              {data.sourceEntityKey}
            </p>
          </button>

          <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />

          <button
            className="gba:flex-1 gba:text-left gba:min-w-0 gba:group"
            onClick={onNavigateToTarget}
            disabled={!onNavigateToTarget}
          >
            <p className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wider">Target</p>
            <p className="gba:text-sm gba:font-medium gba:truncate group-hover:gba:text-primary gba:transition-colors">
              {data.targetEntityDisplayName || data.targetEntityKey}
            </p>
            <p className="gba:text-[10px] gba:font-mono gba:text-muted-foreground gba:truncate">
              {data.targetEntityKey}
            </p>
          </button>
        </div>

        <div className="gba:space-y-2">
          <h4 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
            Details
          </h4>
          <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden gba:divide-y gba:divide-border">
            <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
              <span className="gba:text-xs gba:text-muted-foreground">DB Column</span>
              <span className="gba:text-xs gba:font-mono">{data.foreignKeyColumn}</span>
            </div>
            <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
              <span className="gba:text-xs gba:text-muted-foreground">GraphQL Field</span>
              <span className="gba:text-xs gba:font-mono">{graphqlFieldName || '-'}</span>
            </div>
            <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
              <span className="gba:text-xs gba:text-muted-foreground">Cardinality</span>
              <span className="gba:text-xs gba:font-mono">{typeLabel}</span>
            </div>
            {isManyToMany && data.joinTableName && (
              <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
                <span className="gba:text-xs gba:text-muted-foreground">Join Table</span>
                <span className="gba:text-xs gba:font-mono">{data.joinTableName}</span>
              </div>
            )}
          </div>
        </div>

        {isManyToMany && data.joinTableName && (
          <div className="gba:space-y-2">
            <h4 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
              Join Table Schema
            </h4>
            <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden gba:divide-y gba:divide-border">
              <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-1.5 gba:text-xs">
                <span className="gba:font-mono gba:text-foreground">source_id</span>
                <span className="gba:font-mono gba:text-muted-foreground">UUID FK</span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-1.5 gba:text-xs">
                <span className="gba:font-mono gba:text-foreground">target_id</span>
                <span className="gba:font-mono gba:text-muted-foreground">UUID</span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-1.5 gba:text-xs">
                <span className="gba:font-mono gba:text-foreground">created_at</span>
                <span className="gba:font-mono gba:text-muted-foreground">TIMESTAMPTZ</span>
              </div>
            </div>
            <p className="gba:text-[10px] gba:text-muted-foreground">
              Primary key: (source_id, target_id). Cascade delete on source.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
