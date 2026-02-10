/**
 * EmailSidebar - Folder navigation sidebar for the email client.
 * Shows account info, folder tree with unread counts, and compose button.
 */

import React from 'react'
import { Button, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Archive,
  Star,
  AlertOctagon,
  FolderClosed,
  Plus,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Mail,
  RefreshCw,
  Settings
} from 'lucide-react'
import type { EmailFolder, EmailAccount } from '../types'

const FOLDER_ICONS: Record<string, React.ElementType> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  archive: Archive,
  starred: Star,
  spam: AlertOctagon,
  custom: FolderClosed
}

interface EmailSidebarProps {
  folders: EmailFolder[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string) => void
  isStarredView?: boolean
  onSelectStarred?: () => void
  onCompose: () => void
  onSync: () => void
  onSettings: () => void
  onBack: () => void
  accounts: EmailAccount[]
  activeAccount?: EmailAccount
  isCollapsed: boolean
  onToggleCollapse: () => void
  'data-testid'?: string
}

export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  isStarredView = false,
  onSelectStarred,
  onCompose,
  onSync,
  onSettings,
  onBack,
  // accounts - available if needed for account selector
  activeAccount,
  isCollapsed,
  onToggleCollapse,
  'data-testid': testId = 'email-sidebar'
}) => {
  return (
    <aside
      className={`gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0 gba:transition-all gba:duration-300 ${
        isCollapsed ? 'gba:w-16' : 'gba:w-60'
      }`}
      data-testid={testId}
    >
      {/* Header */}
      <div className={`gba:border-b ${isCollapsed ? 'gba:p-2' : 'gba:p-4'}`}>
        <div
          className={`gba:flex gba:items-center gba:mb-2 ${isCollapsed ? 'gba:justify-center' : 'gba:justify-between'}`}
        >
          <TooltipProvider>
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onBack} data-testid={`${testId}-back`}>
                    <ChevronLeft className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Desk</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onToggleCollapse} data-testid={`${testId}-toggle`}>
                  {isCollapsed ? (
                    <PanelLeft className="gba:w-4 gba:h-4" />
                  ) : (
                    <PanelLeftClose className="gba:w-4 gba:h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Brand */}
        {!isCollapsed && (
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Mail className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
            </div>
            <div>
              <h1 className="gba:font-semibold gba:text-foreground">Mail</h1>
              <p className="gba:text-xs gba:text-muted-foreground">{activeAccount?.emailAddress || 'NEWWORK Apps'}</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="gba:flex gba:justify-center">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Mail className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Compose button */}
      <div className={isCollapsed ? 'gba:p-2' : 'gba:p-3'}>
        <Button
          onClick={onCompose}
          className={`gba:w-full gba:gap-2 ${isCollapsed ? 'gba:justify-center gba:px-0' : 'gba:justify-start'}`}
          data-testid={`${testId}-compose`}
        >
          <Plus className="gba:w-4 gba:h-4" />
          {!isCollapsed && 'Compose'}
        </Button>
      </div>

      {/* Folders */}
      <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2">
        <div className="gba:space-y-0.5">
          <TooltipProvider>
            {/* Starred virtual folder */}
            {onSelectStarred && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onSelectStarred}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                      isCollapsed ? 'gba:justify-center' : 'gba:gap-3'
                    } ${
                      isStarredView
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                    data-testid={`${testId}-folder-starred`}
                  >
                    <Star className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                    {!isCollapsed && <span className="gba:flex-1 gba:text-left">Starred</span>}
                  </button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Starred</TooltipContent>}
              </Tooltip>
            )}

            {/* Separator after starred */}
            {onSelectStarred && !isCollapsed && <div className="gba:border-b gba:my-1" />}

            {folders.map(folder => {
              const Icon = FOLDER_ICONS[folder.type] || FolderClosed
              const isActive = selectedFolderId === folder.id
              return (
                <Tooltip key={folder.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectFolder(folder.id)}
                      className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                        isCollapsed ? 'gba:justify-center' : 'gba:gap-3'
                      } ${
                        isActive
                          ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                          : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                      }`}
                      data-testid={`${testId}-folder-${folder.type}`}
                    >
                      <Icon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="gba:flex-1 gba:text-left gba:truncate">{folder.name}</span>
                          {folder.unreadCount > 0 && (
                            <Badge variant="secondary" className="gba:text-xs gba:ml-auto">
                              {folder.unreadCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {folder.name}
                      {folder.unreadCount > 0 && ` (${folder.unreadCount})`}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </div>
      </nav>

      {/* Footer actions */}
      <div className={`gba:border-t ${isCollapsed ? 'gba:p-2' : 'gba:p-3'}`}>
        <div className={`gba:flex ${isCollapsed ? 'gba:flex-col gba:items-center gba:gap-2' : 'gba:gap-2'}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onSync} data-testid={`${testId}-sync`}>
                  <RefreshCw className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync emails</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onSettings} data-testid={`${testId}-settings`}>
                  <Settings className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Account settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  )
}
