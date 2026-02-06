/**
 * EmailAppsHub - Main entry point for the Email client.
 * Outlook-inspired 3-panel layout: sidebar | email list | email reader.
 * Supports composing, reading, folder navigation, and account management.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useEmailAccounts, useEmailFolders, useEmails } from './hooks'
import { EmailApiService } from './services/EmailApiService'
import {
  EmailSidebar,
  EmailList,
  EmailReader,
  EmailComposer,
  AccountSetupDialog,
  EmailEmptyState,
  MicrosoftOAuthCallback
} from './components'
import type { EmailMessage, ComposeMode } from './types'

export interface EmailAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const EmailAppsHub: React.FC<EmailAppsHubProps> = ({
  accessToken,
  // userInfo - available if needed for user display name
  'data-testid': testId = 'email-apps-hub'
}) => {
  // ============================================
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  // ============================================

  // Check if this is an OAuth callback
  const [isOAuthCallback, setIsOAuthCallback] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.has('code') && params.has('state')
  })

  // Track if we've processed pending OAuth
  const pendingOAuthProcessed = useRef(false)

  // UI state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('email-hub-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)

  // Compose state
  const [isComposing, setIsComposing] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('new')
  const [replyToMessage, setReplyToMessage] = useState<EmailMessage | null>(null)

  // Data hooks - always call even if OAuth callback (hooks must be consistent)
  const {
    accounts,
    defaultAccount,
    isLoading: isLoadingAccounts,
    syncAccount,
    refreshAccounts
  } = useEmailAccounts(accessToken)

  const { folders, inboxFolder } = useEmailFolders(accessToken, defaultAccount?.id)

  const {
    messages,
    selectedMessage,
    isLoading: isLoadingMessages,
    selectMessage,
    clearSelection,
    toggleStar,
    deleteMessage,
    moveToFolder,
    refreshMessages
  } = useEmails({
    accessToken,
    folderId: selectedFolderId || undefined,
    accountId: defaultAccount?.id,
    search: searchQuery || undefined
  })

  // Handle OAuth callback completion
  const handleOAuthSuccess = useCallback(() => {
    console.log(
      '[EmailAppsHub] OAuth success, checking stored data:',
      sessionStorage.getItem('ms_oauth_pending') ? 'found' : 'not found'
    )
    window.history.replaceState({}, '', '/platform/mail')
    setIsOAuthCallback(false)
    // Don't reload - let the useEffect handle account creation
  }, [])

  const handleOAuthError = useCallback((error: string) => {
    toast.error(`Microsoft sign-in failed: ${error}`)
    window.history.replaceState({}, '', '/platform/mail')
    setIsOAuthCallback(false)
  }, [])

  // Handlers
  const handleCompose = useCallback((mode: ComposeMode = 'new', replyTo?: EmailMessage) => {
    setComposeMode(mode)
    setReplyToMessage(replyTo || null)
    setIsComposing(true)
  }, [])

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      setSelectedFolderId(folderId)
      clearSelection()
      setSearchQuery('')
    },
    [clearSelection]
  )

  const handleSync = useCallback(async () => {
    if (!defaultAccount) return
    try {
      toast.info('Syncing emails...')
      await syncAccount(defaultAccount.id)
      await refreshMessages()
      toast.success('Emails synced')
    } catch {
      toast.error('Sync failed')
    }
  }, [defaultAccount, syncAccount, refreshMessages])

  const handleArchive = useCallback(
    async (id: string) => {
      const archiveFolder = folders.find(f => f.type === 'archive')
      if (archiveFolder) {
        await moveToFolder(id, archiveFolder.id)
        toast.success('Email archived')
      }
    },
    [folders, moveToFolder]
  )

  const handleBack = useCallback(() => {
    navigateTo('/platform/every-office')
  }, [])

  // Check for pending Microsoft OAuth data and create account
  useEffect(() => {
    const processPendingOAuth = async () => {
      console.log('[EmailAppsHub] processPendingOAuth called', {
        pendingOAuthProcessed: pendingOAuthProcessed.current,
        hasAccessToken: !!accessToken,
        isOAuthCallback
      })

      if (pendingOAuthProcessed.current || !accessToken || isOAuthCallback) {
        console.log('[EmailAppsHub] Skipping pending OAuth processing')
        return
      }

      const pendingData = sessionStorage.getItem('ms_oauth_pending')
      console.log('[EmailAppsHub] Pending OAuth data:', pendingData ? 'found' : 'not found')

      if (!pendingData) return

      pendingOAuthProcessed.current = true
      sessionStorage.removeItem('ms_oauth_pending')

      try {
        const data = JSON.parse(pendingData)
        console.log('[EmailAppsHub] Creating account for:', data.email)
        EmailApiService.setAccessToken(accessToken)

        toast.info('Setting up your Microsoft email account...')

        const account = await EmailApiService.createAccount({
          displayName: data.name || data.email.split('@')[0],
          emailAddress: data.email,
          provider: 'microsoft',
          imapHost: 'outlook.office365.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.office365.com',
          smtpPort: 587,
          smtpSecure: false,
          oauthAccessToken: data.accessToken,
          oauthRefreshToken: data.refreshToken,
          isDefault: true
        })

        console.log('[EmailAppsHub] Account created:', account)
        toast.success('Microsoft email account connected!')

        // Refresh accounts instead of full page reload
        await refreshAccounts()
      } catch (err) {
        console.error('[EmailAppsHub] Failed to create Microsoft email account:', err)
        toast.error('Failed to connect Microsoft account. Please try again.')
      }
    }

    processPendingOAuth()
  }, [accessToken, isOAuthCallback, refreshAccounts])

  // Auto-select inbox when folders load
  useEffect(() => {
    if (inboxFolder && !selectedFolderId) {
      setSelectedFolderId(inboxFolder.id)
    }
  }, [inboxFolder, selectedFolderId])

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem('email-hub-sidebar-collapsed', String(isSidebarCollapsed))
    } catch {}
  }, [isSidebarCollapsed])

  // ============================================
  // CONDITIONAL RENDERS (after all hooks)
  // ============================================

  // Show OAuth callback handler if we're processing a callback
  if (isOAuthCallback) {
    return (
      <div className="gba:flex gba:h-full gba:bg-background gba:items-center gba:justify-center" data-testid={testId}>
        <MicrosoftOAuthCallback accessToken={accessToken} onSuccess={handleOAuthSuccess} onError={handleOAuthError} />
      </div>
    )
  }

  // Get current folder name
  const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Inbox'

  // If no accounts and done loading, show empty state
  if (!isLoadingAccounts && accounts.length === 0) {
    return (
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        <EmailEmptyState onAddAccount={() => setIsAccountDialogOpen(true)} />
        <AccountSetupDialog
          open={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onAccountCreated={refreshAccounts}
        />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <EmailSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        onCompose={() => handleCompose('new')}
        onSync={handleSync}
        onSettings={() => setIsAccountDialogOpen(true)}
        onBack={handleBack}
        accounts={accounts}
        activeAccount={defaultAccount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Email List */}
      <EmailList
        messages={messages}
        selectedMessageId={selectedMessage?.id || null}
        isLoading={isLoadingMessages}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectMessage={selectMessage}
        onToggleStar={toggleStar}
        folderName={currentFolderName}
      />

      {/* Email Reader */}
      <EmailReader
        message={selectedMessage}
        onCompose={handleCompose}
        onDelete={deleteMessage}
        onToggleStar={toggleStar}
        onArchive={handleArchive}
      />

      {/* Composer */}
      <EmailComposer
        isOpen={isComposing}
        onClose={() => setIsComposing(false)}
        mode={composeMode}
        replyToMessage={replyToMessage}
        accounts={accounts}
        defaultAccountId={defaultAccount?.id}
        onSent={refreshMessages}
      />

      {/* Account setup dialog */}
      <AccountSetupDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        onAccountCreated={refreshAccounts}
      />
    </div>
  )
}

export default EmailAppsHub
