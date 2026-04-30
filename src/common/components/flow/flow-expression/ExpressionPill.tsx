/**
 * ExpressionPill Component
 *
 * Renders a styled pill/badge for displaying expressions with icons,
 * contextual colors, and source information.
 */

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import {
  Activity,
  AlertCircle,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Clock,
  Code,
  Contact,
  File,
  Folder,
  Hash,
  Link,
  List,
  PenTool,
  Text,
  ToggleLeft,
  User,
  UserPlus
} from 'lucide-react'
import { ExpressionSourceType, ParsedExpression } from '@/common/data/flow/utils/expressionParser'

interface ExpressionPillProps {
  expression: ParsedExpression
  'data-testid'?: string
}

/**
 * Map icon string names to Lucide components
 */
const ICON_MAP: Record<string, React.ElementType> = {
  text: Text,
  hash: Hash,
  calendar: Calendar,
  'calendar-clock': CalendarClock,
  'toggle-left': ToggleLeft,
  folder: Folder,
  list: List,
  file: File,
  user: User,
  clock: Clock,
  activity: Activity,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  link: Link,
  'pen-tool': PenTool,
  'book-open': BookOpen,
  box: Box,
  'building-2': Building2,
  briefcase: Briefcase,
  'user-plus': UserPlus,
  contact: Contact,
  'clipboard-list': ClipboardList,
  code: Code
}

/**
 * Get color classes based on source type - using more vibrant, clearly visible colors
 */
function getSourceTypeColors(sourceType: ExpressionSourceType): string {
  switch (sourceType) {
    case 'workflow':
      return 'gba:bg-info gba:text-info-foreground gba:border-info'
    case 'step':
      return 'gba:bg-success gba:text-success-foreground gba:border-success'
    case 'entity':
      return 'gba:bg-primary gba:text-primary-foreground gba:border-primary'
    case 'catalog':
      return 'gba:bg-warning gba:text-warning-foreground gba:border-warning'
    case 'file':
      return 'gba:bg-secondary gba:text-secondary-foreground gba:border-secondary'
    default:
      return 'gba:bg-accent gba:text-accent-foreground gba:border-accent'
  }
}

/**
 * Get context color classes (slightly muted for "from" text)
 */
function getContextColors(sourceType: ExpressionSourceType): string {
  switch (sourceType) {
    case 'workflow':
      return 'gba:text-info-foreground/80'
    case 'step':
      return 'gba:text-success-foreground/80'
    case 'entity':
      return 'gba:text-primary-foreground/80'
    case 'catalog':
      return 'gba:text-warning-foreground/80'
    case 'file':
      return 'gba:text-secondary-foreground/80'
    default:
      return 'gba:text-accent-foreground/80'
  }
}

/**
 * ExpressionPill - Styled pill component for displaying parsed expressions
 */
export const ExpressionPill: React.FC<ExpressionPillProps> = ({
  expression,
  'data-testid': testId = 'expression-pill'
}) => {
  const IconComponent = ICON_MAP[expression.icon] || Text
  const colorClasses = getSourceTypeColors(expression.sourceType)
  const contextColorClasses = getContextColors(expression.sourceType)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:transition-colors hover:gba:opacity-90 ${colorClasses}`}
            data-testid={testId}
          >
            <IconComponent className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[150px]">{expression.label}</span>
            {expression.sourceContext && (
              <>
                <span className={`gba:text-[10px] ${contextColorClasses}`}>from</span>
                <span className={`gba:text-[10px] gba:truncate gba:max-w-[100px] ${contextColorClasses}`}>
                  {expression.sourceContext}
                </span>
              </>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-1.5">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">Expression</div>
            <code className="gba:block gba:text-xs gba:font-mono gba:break-all gba:bg-secondary gba:text-secondary-foreground gba:px-2 gba:py-1 gba:rounded">
              {expression.raw}
            </code>
            <div className="gba:text-xs gba:text-muted-foreground">
              <span className="gba:font-medium gba:text-foreground">Type:</span> {expression.dataType}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * FileUrlPill - Pill for URL-style file expressions: file://{{id}}?name={{name}}&url={{url}}
 */
interface FileUrlPillProps {
  id: ParsedExpression
  name?: ParsedExpression
  url?: ParsedExpression
  'data-testid'?: string
}

export const FileUrlPill: React.FC<FileUrlPillProps> = ({ id, name, url, 'data-testid': testId = 'file-url-pill' }) => {
  const displayLabel = name?.label || id.label || 'File'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-secondary gba:bg-secondary gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:text-secondary-foreground gba:transition-colors hover:gba:opacity-90"
            data-testid={testId}
          >
            <File className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[120px]">{displayLabel}</span>
            {url && <span className="gba:text-[10px] gba:text-secondary-foreground/80">with link</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-2">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">File Reference</div>
            <div className="gba:space-y-1.5">
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">ID:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {id.raw}
                </code>
              </div>
              {name && (
                <div className="gba:text-xs">
                  <span className="gba:font-medium gba:text-foreground">Name:</span>
                  <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                    {name.raw}
                  </code>
                </div>
              )}
              {url && (
                <div className="gba:text-xs">
                  <span className="gba:font-medium gba:text-foreground">URL:</span>
                  <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                    {url.raw}
                  </code>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * EntityUrlPill - Pill for URL-style entity expressions: employee://{{id}}
 */
interface EntityUrlPillProps {
  entityType: string
  id: ParsedExpression
  name?: ParsedExpression
  'data-testid'?: string
}

export const EntityUrlPill: React.FC<EntityUrlPillProps> = ({
  entityType,
  id,
  name,
  'data-testid': testId = 'entity-url-pill'
}) => {
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase()
  const displayLabel = name?.label || id.label || entityTypeName

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-primary gba:bg-primary gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:text-primary-foreground gba:transition-colors hover:gba:opacity-90"
            data-testid={testId}
          >
            <User className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[120px]">{displayLabel}</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">from</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">{entityTypeName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-2">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">{entityTypeName} Reference</div>
            <div className="gba:space-y-1.5">
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">ID:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {id.raw}
                </code>
              </div>
              {name && (
                <div className="gba:text-xs">
                  <span className="gba:font-medium gba:text-foreground">Name:</span>
                  <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                    {name.raw}
                  </code>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * FileLinkPill - Legacy pill for file link expressions (FILE_LINK::name{{...}}::urlfile://{{...}})
 */
interface FileLinkPillProps {
  fileName: ParsedExpression
  downloadPath: ParsedExpression
  'data-testid'?: string
}

export const FileLinkPill: React.FC<FileLinkPillProps> = ({
  fileName,
  downloadPath,
  'data-testid': testId = 'file-link-pill'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-secondary gba:bg-secondary gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:text-secondary-foreground gba:transition-colors hover:gba:opacity-90"
            data-testid={testId}
          >
            <File className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[120px]">{fileName.label}</span>
            <span className="gba:text-[10px] gba:text-secondary-foreground/80">with download</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-2">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">File Link (Legacy)</div>
            <div className="gba:space-y-1.5">
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">File Name:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {fileName.raw}
                </code>
              </div>
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">Download URL:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {downloadPath.raw}
                </code>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * EntityRefPill - Special pill for legacy entity reference expressions (ENTITY::id{{...}})
 */
interface EntityRefPillProps {
  entityType: string
  expression: ParsedExpression
  'data-testid'?: string
}

export const EntityRefPill: React.FC<EntityRefPillProps> = ({
  entityType,
  expression,
  'data-testid': testId = 'entity-ref-pill'
}) => {
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-primary gba:bg-primary gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:text-primary-foreground gba:transition-colors hover:gba:opacity-90"
            data-testid={testId}
          >
            <User className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[120px]">{expression.label}</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">from</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">{entityTypeName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-1.5">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">{entityTypeName} Reference</div>
            <code className="gba:block gba:text-xs gba:font-mono gba:break-all gba:bg-secondary gba:text-secondary-foreground gba:px-2 gba:py-1 gba:rounded">
              {expression.raw}
            </code>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * EntityStructuredPill - Pill for structured entity references (ENTITY::name{{...}}::id{{...}})
 */
interface EntityStructuredPillProps {
  entityType: string
  nameExpression: ParsedExpression
  idExpression: ParsedExpression
  'data-testid'?: string
}

export const EntityStructuredPill: React.FC<EntityStructuredPillProps> = ({
  entityType,
  nameExpression,
  idExpression,
  'data-testid': testId = 'entity-structured-pill'
}) => {
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-primary gba:bg-primary gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:text-primary-foreground gba:transition-colors hover:gba:opacity-90"
            data-testid={testId}
          >
            <User className="gba:h-3 gba:w-3 gba:shrink-0" />
            <span className="gba:truncate gba:max-w-[120px]">{nameExpression.label}</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">from</span>
            <span className="gba:text-[10px] gba:text-primary-foreground/80">{entityTypeName}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="gba:max-w-xs gba:bg-popover gba:text-popover-foreground gba:border gba:border-border"
        >
          <div className="gba:space-y-2">
            <div className="gba:font-semibold gba:text-xs gba:text-foreground">{entityTypeName} Reference</div>
            <div className="gba:space-y-1.5">
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">Name:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {nameExpression.raw}
                </code>
              </div>
              <div className="gba:text-xs">
                <span className="gba:font-medium gba:text-foreground">ID:</span>
                <code className="gba:ml-1 gba:font-mono gba:text-[10px] gba:bg-secondary gba:text-secondary-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
                  {idExpression.raw}
                </code>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
