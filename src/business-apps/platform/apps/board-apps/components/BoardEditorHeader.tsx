/**
 * BoardEditorHeader – slim sticky toolbar for the board viewer/editor.
 * h-12 matches the sidebar header height exactly.
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { ArrowLeft, PanelLeft, Search, Share2, Database, GitBranch, Settings, LayoutGrid, Activity } from 'lucide-react'

export interface BoardEditorHeaderProps {
  boardName: string
  isOwner: boolean
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onBack: () => void
  onSearch: () => void
  onShare: () => void
  onImportSystemData: () => void
  onImportFlowData: () => void
  onSettings: () => void
  onActivityLog?: () => void
  'data-testid'?: string
}

export const BoardEditorHeader: React.FC<BoardEditorHeaderProps> = ({
  boardName,
  isOwner,
  isSidebarCollapsed,
  onToggleSidebar,
  onBack,
  onSearch,
  onShare,
  onImportSystemData,
  onImportFlowData,
  onSettings,
  onActivityLog,
  'data-testid': testId = 'board-editor-header'
}) => (
  <div
    className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:h-12 gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10 gba:shrink-0"
    data-testid={testId}
  >
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
      {isSidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-6 gba:w-6"
          onClick={onToggleSidebar}
          data-testid={`${testId}-expand-sidebar`}
        >
          <PanelLeft className="gba:w-4 gba:h-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-foreground"
        data-testid={`${testId}-back`}
      >
        <ArrowLeft className="gba:w-4 gba:h-4" />
        Back
      </Button>
      <div className="gba:w-px gba:h-4 gba:bg-border/30" />
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
        <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
        <span className="gba:text-sm gba:font-medium gba:truncate">{boardName}</span>
      </div>
    </div>

    <div className="gba:flex gba:items-center gba:gap-0.5">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
              onClick={onSearch}
              data-testid={`${testId}-search`}
            >
              <Search className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search in board</TooltipContent>
        </Tooltip>

        {isOwner && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
                onClick={onShare}
                data-testid={`${testId}-share`}
              >
                <Share2 className="gba:w-3.5 gba:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
                  data-testid={`${testId}-import`}
                >
                  <Database className="gba:w-3.5 gba:h-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Import data</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onImportSystemData} data-testid={`${testId}-import-system`}>
              <Database className="gba:w-4 gba:h-4 gba:mr-2" /> System data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportFlowData} data-testid={`${testId}-import-flow`}>
              <GitBranch className="gba:w-4 gba:h-4 gba:mr-2" /> Flow data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onActivityLog && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
                onClick={onActivityLog}
                data-testid={`${testId}-activity-log`}
              >
                <Activity className="gba:w-3.5 gba:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Board activity</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-7 gba:w-7 gba:text-muted-foreground hover:gba:text-foreground"
              onClick={onSettings}
              data-testid={`${testId}-settings`}
            >
              <Settings className="gba:w-3.5 gba:h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Board settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
)
