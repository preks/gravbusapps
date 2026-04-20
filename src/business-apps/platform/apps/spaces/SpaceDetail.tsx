/**
 * SpaceDetail - Individual Space Entry Page
 *
 * Beautiful entry page with hero, stats, pinned content, activity, and content browser.
 * Includes team collaboration features (chat, calls, calendar) for dimension-based spaces.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger, toast, useTranslation } from '@newwork/nw-design-system'

// Components
import {
  SpaceHero,
  SpaceStats,
  SpacePinned,
  SpaceActivity,
  SpaceMembersTab,
  AddContentDialog,
  SpaceCalendar,
  ScheduleMeetingButton,
  SpaceRealTimeActivity,
  SpaceTeamChatPanel,
  SpaceTeamPresence
} from './components'
import { SpaceDrivePanel } from './components/SpaceDrivePanel'
import { InviteMemberDialog } from './components/InviteMemberDialog'
import { MoveContentDialog } from './components/MoveContentDialog'
import { SpaceSettingsDialog } from './components/SpaceSettingsDialog'
import type { DriveItem } from '@/business-apps/core/office/apps/drive/types/drive.types'

// Hooks
import { useSpace } from './hooks/useSpace'
import { useSpaceContent } from './hooks/useSpaceContent'
import { useSpaceActivity } from './hooks/useSpaceActivity'
import { useSpaceUserLookup } from './hooks/useSpaceUserLookup'
import { useLinkedGroupChat } from './hooks/useLinkedGroupChat'
import { useSpaceCall } from './hooks/useSpaceCall'
import type {
  SpaceContentItem,
  AddMemberInput,
  MoveContentInput,
  SpaceMemberRole,
  UpdateSpaceInput
} from './types/space.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import translations from './_i18n'

export interface SpaceDetailProps extends BusinessAppContextProps {
  spaceId: string
  /** When provided, Back button clears router state and navigates so the view updates immediately */
  onNavigateToHub?: () => void
  'data-testid'?: string
}

export const SpaceDetail: React.FC<SpaceDetailProps> = ({
  spaceId,
  accessToken,
  userInfo,
  onNavigateToHub,
  'data-testid': testId = 'space-detail'
}) => {
  const { t } = useTranslation(translations)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'drive' | 'members'>('overview')
  const [additionalUserIds, setAdditionalUserIds] = useState<string[]>([])

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch space data (keep hook result for deleteSpace so the callback always closes over the real API)
  const spaceData = useSpace(spaceId, accessToken, true)
  const {
    space,
    isLoading: spaceLoading,
    refresh: refreshSpace,
    updateSpace,
    addMember,
    updateMember,
    removeMember
  } = spaceData
  const {
    documents,
    notes,
    spreadsheets,
    slides,
    allContent,
    moveContent,
    addItemsToLocalState,
    refresh: refreshContent
  } = useSpaceContent(spaceId, accessToken, space, refreshSpace)
  const {
    activities,
    isLoading: activityLoading,
    refresh: refreshActivity
  } = useSpaceActivity(spaceId, accessToken, 20)

  const drivePanelRefreshRef = useRef<(() => void) | null>(null)

  // Add activity user IDs to lookup when activities load
  useEffect(() => {
    if (activities.length > 0) {
      const activityUserIds = activities.map(a => a.userId).filter(Boolean)
      if (activityUserIds.length > 0) {
        setAdditionalUserIds(prev => {
          const existingSet = new Set(prev)
          const newIds = activityUserIds.filter(id => !existingSet.has(id))
          if (newIds.length === 0) return prev
          return [...prev, ...newIds]
        })
      }
    }
  }, [activities])

  // Get space dimension info for team collaboration features
  const spaceDimension = space?.settings?.dimension

  // Find linked group chat for dimension-based spaces
  const {
    conversation: linkedConversation,
    isLoading: chatLoading,
    error: chatError
  } = useLinkedGroupChat(spaceDimension, accessToken)

  // Hook for starting calls from space
  const { startAudioCall, startVideoCall, canStartCall } = useSpaceCall(linkedConversation)

  // Whether this space has team collaboration features (dimension-based)
  const hasTeamCollaboration = !!spaceDimension

  // Debug: prove SpaceDetail is running + whether the collaboration section is mounted
  useEffect(() => {
    let debugEnabled = false
    try {
      debugEnabled = window.localStorage?.getItem('gba:debug:space-activity') === '1'
    } catch {
      debugEnabled = false
    }
    if (!debugEnabled) return
    console.error('[SpaceActivity] SpaceDetail debug', {
      spaceId,
      hasTeamCollaboration,
      allContentCount: allContent.length,
      href: window.location.href
    })
  }, [spaceId, hasTeamCollaboration, allContent.length])

  // Collect user IDs to look up (owner + members + message senders)
  const userIdsToLookup = useMemo(() => {
    const ids: string[] = []
    if (space?.ownerId) ids.push(space.ownerId)
    space?.members?.forEach(m => {
      if (m.userId) ids.push(m.userId)
    })
    // Include additional IDs (e.g., message senders)
    additionalUserIds.forEach(id => {
      if (id) ids.push(id)
    })
    return [...new Set(ids)]
  }, [space, additionalUserIds])

  // Callback when new user IDs need to be looked up (e.g., message senders)
  const handleUserIdsNeeded = useCallback((newIds: string[]) => {
    setAdditionalUserIds(prev => {
      const existingSet = new Set(prev)
      const uniqueNewIds = newIds.filter(id => !existingSet.has(id))
      if (uniqueNewIds.length === 0) return prev
      return [...prev, ...uniqueNewIds]
    })
  }, [])

  // Lookup user info for owner and members
  const { getUserInfo } = useSpaceUserLookup({
    accessToken: accessToken || '',
    userIds: userIdsToLookup
  })

  // Get owner info
  const ownerInfo = useMemo(() => {
    if (!space?.ownerId) return undefined
    return getUserInfo(space.ownerId)
  }, [space?.ownerId, getUserInfo])

  // Enrich members with user info
  const enrichedMembers = useMemo(() => {
    return (space?.members || []).map(member => {
      const info = getUserInfo(member.userId)
      return {
        ...member,
        userName: info?.name,
        userAvatar: info?.avatar,
        jobTitle: info?.jobTitle,
        department: info?.department
      }
    })
  }, [space?.members, getUserInfo])

  // Determine user role
  const userRole = useMemo(() => {
    if (!space || !currentUserId) return null
    if (space.ownerId === currentUserId) return 'owner'
    return space.members?.find(m => m.userId === currentUserId)?.role || null
  }, [space, currentUserId])

  const isOwner = userRole === 'owner'
  const canManageMembers = userRole === 'owner' || userRole === 'admin'
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

  // Calculate stats
  const stats = useMemo(() => {
    const contentCounts = space?.settings?.contentCounts || {
      documents: 0,
      notes: 0,
      spreadsheets: 0,
      slides: 0,
      total: 0
    }

    return {
      documents: contentCounts.documents || documents.length,
      notes: contentCounts.notes || notes.length,
      spreadsheets: contentCounts.spreadsheets || spreadsheets.length,
      slides: contentCounts.slides ?? slides.length,
      recentActivity: activities.length
    }
  }, [space, documents, notes, spreadsheets, slides, activities])

  // Get pinned items (from settings)
  const pinnedItems = useMemo(() => {
    const pinnedIds = space?.settings?.pinnedItems || []
    return allContent.filter(item => pinnedIds.includes(item.id)).slice(0, 4)
  }, [space, allContent])

  // Handlers
  const handleBack = useCallback(() => {
    if (onNavigateToHub) {
      onNavigateToHub()
    } else {
      navigateTo(buildPlatformUrl('/platform/every-office/spaces'))
    }
  }, [onNavigateToHub])

  const handleSettings = useCallback(() => {
    setSettingsDialogOpen(true)
  }, [])

  const handleSaveSettings = useCallback(
    async (input: UpdateSpaceInput) => {
      await updateSpace(input)
    },
    [updateSpace]
  )

  const handleDeleteSpace = useCallback(async (): Promise<boolean> => {
    const ok = await spaceData.deleteSpace()
    if (ok) {
      toast.success(t('detail-toast-space-deleted'))
      handleBack()
    } else {
      toast.error(t('detail-toast-space-delete-failed'))
    }
    return ok
  }, [handleBack, spaceData.deleteSpace, t])

  const handleShare = useCallback(() => {
    setInviteDialogOpen(true)
  }, [])

  const handleInviteMember = useCallback(
    async (input: AddMemberInput) => {
      await addMember(input)
    },
    [addMember]
  )

  const handleUpdateMemberRole = useCallback(
    async (userId: string, role: SpaceMemberRole) => {
      await updateMember(userId, role)
    },
    [updateMember]
  )

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      await removeMember(userId)
    },
    [removeMember]
  )

  const handleItemClick = useCallback(
    (item: SpaceContentItem) => {
      let url: string
      const spaceParam = `spaceId=${encodeURIComponent(spaceId)}`

      // Store the current space URL in sessionStorage for the back button
      const currentSpaceUrl = `/platform/every-office/spaces?spaceId=${encodeURIComponent(spaceId)}`

      try {
        sessionStorage.setItem('space_return_url', currentSpaceUrl)
      } catch (e) {
        console.warn('Failed to store return URL in sessionStorage:', e)
      }

      switch (item.type) {
        case 'document':
          url = `/platform/every-office/documents?docId=${item.id}&view=editor`
          break
        case 'note':
          url = `/platform/every-office/notes?noteId=${item.id}&view=editor`
          break
        case 'spreadsheet':
          url = `/platform/every-office/spreadsheets?appId=${item.id}&view=viewer`
          break
        case 'slide':
          url = `/platform/every-office/slides?slideId=${item.id}&view=editor`
          break
        case 'whiteboard':
          url = `/platform/every-office/whiteboards?whiteboardId=${item.id}`
          break
      }

      // Include spaceId parameter
      const urlWithParams = url.includes('?') ? `${url}&${spaceParam}` : `${url}?${spaceParam}`
      navigateTo(buildPlatformUrl(urlWithParams))
    },
    [spaceId]
  )

  const handleDriveItemClick = useCallback(
    (item: DriveItem) => {
      const spaceParam = `spaceId=${encodeURIComponent(spaceId)}`
      const currentSpaceUrl = `/platform/every-office/spaces?spaceId=${encodeURIComponent(spaceId)}`
      try {
        sessionStorage.setItem('space_return_url', currentSpaceUrl)
      } catch {
        /* noop */
      }

      let url: string | undefined
      switch (item.type) {
        case 'document':
          url = `/platform/every-office/documents?docId=${item.id}&view=editor`
          break
        case 'note':
          url = `/platform/every-office/notes?noteId=${item.id}&view=editor`
          break
        case 'spreadsheet_app':
          url = `/platform/every-office/spreadsheets?appId=${item.id}&view=viewer`
          break
        case 'slide':
          url = `/platform/every-office/slides?slideId=${item.id}&view=editor`
          break
        case 'drive_file':
          url = `/platform/every-office/drive?fileId=${item.id}&from=space`
          break
      }

      if (url) {
        const urlWithParams = url.includes('?') ? `${url}&${spaceParam}` : `${url}?${spaceParam}`
        navigateTo(buildPlatformUrl(urlWithParams))
      }
    },
    [spaceId]
  )

  const handleMoveContent = useCallback(
    async (input: MoveContentInput) => {
      await moveContent({ contentType: input.contentType, entityId: input.entityId })
    },
    [moveContent]
  )

  const handleAddContent = useCallback(
    async (
      items: { type: 'document' | 'note' | 'spreadsheet' | 'slide'; id: string; title?: string; name?: string }[]
    ) => {
      if (items.length === 0) return

      try {
        const API_URL = getDocumentServiceApiUrl()

        // Add items to local state immediately for instant UI update
        addItemsToLocalState(items)

        const response = await fetch(`${API_URL}/spaces/${spaceId}/content/bulk`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: items.map(item => ({
              entityType: item.type === 'spreadsheet' ? 'spreadsheet_app' : item.type,
              entityId: item.id
            }))
          })
        })

        if (response.ok) {
          await refreshContent()
          drivePanelRefreshRef.current?.()
          refreshActivity()
          return
        }

        // Fallback: add items individually
        for (const item of items) {
          await moveContent({ contentType: item.type, entityId: item.id })
        }
        drivePanelRefreshRef.current?.()
        refreshActivity()
      } catch (error) {
        console.error('Failed to add content:', error)
        // Fallback to individual calls
        for (const item of items) {
          await moveContent({ contentType: item.type, entityId: item.id })
        }
        drivePanelRefreshRef.current?.()
        refreshActivity()
      }
    },
    [spaceId, accessToken, moveContent, addItemsToLocalState, refreshContent, refreshActivity]
  )

  // Loading state
  if (spaceLoading) {
    return (
      <div className="gba:min-h-screen gba:bg-background gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <div className="gba:w-16 gba:h-16 gba:border-4 gba:border-primary gba:border-t-transparent gba:rounded-full gba:animate-spin gba:mx-auto gba:mb-4" />
          <p className="gba:text-muted-foreground">{t('detail-loading-space')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!space) {
    return (
      <div className="gba:min-h-screen gba:bg-background gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">{t('detail-not-found-title')}</h2>
          <p className="gba:text-muted-foreground">{t('detail-not-found-description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={testId}>
      {/* Hero Section */}
      <SpaceHero
        space={space}
        members={enrichedMembers}
        ownerInfo={ownerInfo}
        canOpenSpaceSettings={canManageMembers}
        canEdit={canEdit}
        onBack={handleBack}
        onSettings={handleSettings}
        onShare={handleShare}
        onAddContent={() => setAddContentDialogOpen(true)}
        data-testid={`${testId}-hero`}
      />

      {/* Content */}
      <main className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8 gba:space-y-8">
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'overview' | 'drive' | 'members')}
          className="gba:space-y-6"
        >
          <TabsList className="gba:w-fit" data-testid={`${testId}-tabs`}>
            <TabsTrigger value="overview" data-testid={`${testId}-tab-overview`}>
              {t('detail-tab-overview')}
            </TabsTrigger>
            <TabsTrigger value="drive" data-testid={`${testId}-tab-drive`}>
              {t('detail-tab-drive')}
            </TabsTrigger>
            <TabsTrigger value="members" data-testid={`${testId}-tab-members`}>
              {t('detail-tab-members', { count: space.members?.length || 0 })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-8" data-testid={`${testId}-tab-content-overview`}>
            {/* Quick Stats */}
            <SpaceStats
              documents={stats.documents}
              spreadsheets={stats.spreadsheets}
              notes={stats.notes}
              slides={stats.slides}
              recentActivity={stats.recentActivity}
              data-testid={`${testId}-stats`}
            />

            {/* Team Collaboration Section - Only for dimension-based spaces */}
            {hasTeamCollaboration && (
              <section data-testid={`${testId}-team-collaboration`} className="gba:space-y-4">
                {/* Header with Schedule Meeting */}
                <div className="gba:flex gba:items-center gba:justify-between">
                  <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
                    {t('detail-team-collaboration')}
                  </h2>
                  <ScheduleMeetingButton
                    spaceId={spaceId}
                    spaceName={space.name}
                    members={space.members || []}
                    data-testid={`${testId}-schedule-meeting`}
                  />
                </div>

                {/* Team Presence Indicator - shows who's online (via chat WebSocket) */}
                <SpaceTeamPresence members={enrichedMembers} maxAvatars={7} data-testid={`${testId}-team-presence`} />

                {/* Two Column Layout: Chat Panel + Calendar/Activity */}
                <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
                  {/* Left: Combined Team Chat Panel with messages */}
                  <SpaceTeamChatPanel
                    conversation={linkedConversation}
                    isLoading={chatLoading}
                    error={chatError}
                    onStartAudioCall={canStartCall ? startAudioCall : undefined}
                    onStartVideoCall={canStartCall ? startVideoCall : undefined}
                    memberCount={space.members?.length}
                    accessToken={accessToken}
                    maxMessages={8}
                    getUserInfo={getUserInfo}
                    onUserIdsNeeded={handleUserIdsNeeded}
                    data-testid={`${testId}-team-chat-panel`}
                  />

                  {/* Right: Calendar and Live Activity stacked */}
                  <div className="gba:space-y-4">
                    {/* Team Calendar */}
                    <SpaceCalendar
                      spaceId={spaceId}
                      members={space.members || []}
                      accessToken={accessToken}
                      maxMeetings={3}
                      data-testid={`${testId}-team-calendar`}
                    />

                    {/* Live Activity */}
                    <SpaceRealTimeActivity
                      spaceId={spaceId}
                      spaceContent={allContent}
                      accessToken={accessToken}
                      currentUserId={currentUserId}
                      maxActivities={5}
                      data-testid={`${testId}-realtime-activity`}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Pinned Content */}
            {pinnedItems.length > 0 && (
              <section>
                <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">{t('detail-pinned')}</h2>
                <SpacePinned items={pinnedItems} onItemClick={handleItemClick} data-testid={`${testId}-pinned`} />
              </section>
            )}

            {/* Activity Feed - Full Width */}
            <section>
              <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
                {t('detail-recent-activity')}
              </h2>
              <div className="gba:rounded-lg gba:bg-card gba:p-4">
                <SpaceActivity
                  activities={activities}
                  isLoading={activityLoading}
                  spaceId={spaceId}
                  getUserInfo={getUserInfo}
                  data-testid={`${testId}-activity`}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="drive" data-testid={`${testId}-tab-content-drive`}>
            <SpaceDrivePanel
              spaceId={spaceId}
              accessToken={accessToken}
              userInfo={userInfo}
              canEdit={canEdit}
              onItemClick={handleDriveItemClick}
              onRefreshRef={drivePanelRefreshRef}
              onActivityChange={refreshActivity}
              data-testid={`${testId}-drive`}
            />
          </TabsContent>

          <TabsContent value="members" data-testid={`${testId}-tab-content-members`}>
            <SpaceMembersTab
              members={enrichedMembers}
              activities={activities}
              currentUserId={currentUserId}
              isOwner={isOwner}
              canManageMembers={canManageMembers}
              onInvite={() => setInviteDialogOpen(true)}
              onUpdateRole={handleUpdateMemberRole}
              onRemoveMember={handleRemoveMember}
              data-testid={`${testId}-members-tab`}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInviteMember}
        spaceId={spaceId}
        accessToken={accessToken}
        data-testid={`${testId}-invite-dialog`}
      />

      <MoveContentDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onMove={handleMoveContent}
        spaceId={spaceId}
        data-testid={`${testId}-move-dialog`}
      />

      <AddContentDialog
        open={addContentDialogOpen}
        onOpenChange={setAddContentDialogOpen}
        onAddContent={handleAddContent}
        spaceId={spaceId}
        accessToken={accessToken}
        data-testid={`${testId}-add-content-dialog`}
      />

      <SpaceSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        space={space}
        onSave={handleSaveSettings}
        isOwner={isOwner}
        onDeleteSpace={isOwner ? handleDeleteSpace : undefined}
        data-testid={`${testId}-settings-dialog`}
      />
    </div>
  )
}

export default SpaceDetail
