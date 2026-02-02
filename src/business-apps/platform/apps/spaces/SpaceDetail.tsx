/**
 * SpaceDetail - Individual Space Entry Page
 *
 * Beautiful entry page with hero, stats, pinned content, activity, and content browser
 */

import React, { useState, useCallback, useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Components
import {
  SpaceHero,
  SpaceStats,
  SpacePinned,
  SpaceActivity,
  SpaceContent,
  SpaceMembers,
  AddContentDialog
} from './components'
import { InviteMemberDialog } from './components/InviteMemberDialog'
import { MoveContentDialog } from './components/MoveContentDialog'
import { SpaceSettingsDialog } from './components/SpaceSettingsDialog'

// Hooks
import { useSpace } from './hooks/useSpace'
import { useSpaceContent } from './hooks/useSpaceContent'
import { useSpaceActivity } from './hooks/useSpaceActivity'
import { useSpaceUserLookup } from './hooks/useSpaceUserLookup'
import type {
    SpaceContentItem,
    AddMemberInput,
    MoveContentInput,
    SpaceMemberRole,
    UpdateSpaceInput
  } from './types/space.types'

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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Fetch space data
  const {
    space,
    isLoading: spaceLoading,
    refresh: refreshSpace,
    updateSpace,
    addMember,
    updateMember,
    removeMember
  } = useSpace(spaceId, accessToken, true)
  const {
    documents,
    notes,
    spreadsheets,
    slides,
    allContent,
    isLoading: contentLoading,
    moveContent
  } = useSpaceContent(spaceId, accessToken, space, refreshSpace)
  const { activities, isLoading: activityLoading } = useSpaceActivity(spaceId, accessToken, 20)

  // Collect user IDs to look up (owner + members)
  const userIdsToLookup = useMemo(() => {
    const ids: string[] = []
    if (space?.ownerId) ids.push(space.ownerId)
    space?.members?.forEach(m => {
      if (m.userId) ids.push(m.userId)
    })
    return [...new Set(ids)]
  }, [space])

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
        userAvatar: info?.avatar
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
      navigateTo(buildPlatformUrl('/platform/spaces'))
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

  const handleItemClick = useCallback((item: SpaceContentItem) => {
    const isProduction = process.env.NODE_ENV === 'production'
    let url: string

    switch (item.type) {
      case 'document':
        url = isProduction
          ? `/platform/documents?docId=${item.id}&view=editor`
          : `/platform/apps/document-apps?docId=${item.id}&view=editor`
        break
      case 'note':
        url = isProduction
          ? `/platform/notes?noteId=${item.id}&view=editor`
          : `/platform/apps/note-apps?noteId=${item.id}&view=editor`
        break
      case 'spreadsheet':
        url = isProduction
          ? `/platform/spreadsheets?appId=${item.id}&view=viewer`
          : `/platform/apps/spreadsheet-apps?appId=${item.id}&view=viewer`
        break
      case 'slide':
        url = isProduction
          ? `/platform/slides?slideId=${item.id}&view=editor`
          : `/platform/apps/slide-apps?slideId=${item.id}&view=editor`
        break
    }

    navigateTo(buildPlatformUrl(url))
  }, [])

  const handleMoveContent = useCallback(
    async (input: MoveContentInput) => {
      await moveContent({ contentType: input.contentType, entityId: input.entityId })
    },
    [moveContent]
  )

  const handleAddContent = useCallback(
    async (items: { type: 'document' | 'note' | 'spreadsheet' | 'slide'; id: string }[]) => {
      // Add each item to the space
      for (const item of items) {
        await moveContent({ contentType: item.type, entityId: item.id })
      }
    },
    [moveContent]
  )

  // Loading state
  if (spaceLoading) {
    return (
      <div className="gba:min-h-screen gba:bg-background gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <div className="gba:w-16 gba:h-16 gba:border-4 gba:border-primary gba:border-t-transparent gba:rounded-full gba:animate-spin gba:mx-auto gba:mb-4" />
          <p className="gba:text-muted-foreground">Loading space...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!space) {
    return (
      <div className="gba:min-h-screen gba:bg-background gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">Space not found</h2>
          <p className="gba:text-muted-foreground">This space may have been deleted or you do not have access</p>
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
        isOwner={isOwner}
        canEdit={canEdit}
        onBack={handleBack}
        onSettings={handleSettings}
        onShare={handleShare}
        onAddContent={() => setAddContentDialogOpen(true)}
        data-testid={`${testId}-hero`}
      />

      {/* Content */}
      <main className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-8 gba:space-y-8">
        {/* Quick Stats */}
        <SpaceStats
          documents={stats.documents}
          spreadsheets={stats.spreadsheets}
          notes={stats.notes}
          slides={stats.slides}
          recentActivity={stats.recentActivity}
          data-testid={`${testId}-stats`}
        />

        {/* Pinned Content */}
        {pinnedItems.length > 0 && (
          <section>
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">Pinned</h2>
            <SpacePinned items={pinnedItems} onItemClick={handleItemClick} data-testid={`${testId}-pinned`} />
          </section>
        )}

        {/* Two Column Layout: Activity & Members */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-8">
          {/* Left: Activity Feed */}
          <section className="gba:lg:col-span-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">Recent Activity</h2>
            <div className="gba:rounded-lg gba:bg-card gba:p-4">
              <SpaceActivity activities={activities} isLoading={activityLoading} data-testid={`${testId}-activity`} />
            </div>
          </section>

          {/* Right: Members */}
          <section>
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">Members</h2>
            <div className="gba:rounded-lg gba:bg-card gba:p-4">
              <SpaceMembers
                members={enrichedMembers}
                currentUserId={currentUserId}
                isOwner={isOwner}
                canManageMembers={canManageMembers}
                onInvite={() => setInviteDialogOpen(true)}
                onUpdateRole={handleUpdateMemberRole}
                onRemoveMember={handleRemoveMember}
                data-testid={`${testId}-members`}
              />
            </div>
          </section>
        </div>

        {/* Content Browser */}
        <section>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">All Content</h2>
          <SpaceContent
            items={allContent}
            isLoading={contentLoading}
            onItemClick={handleItemClick}
            data-testid={`${testId}-content`}
          />
        </section>
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
        data-testid={`${testId}-add-content-dialog`}
      />

      <SpaceSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        space={space}
        onSave={handleSaveSettings}
        data-testid={`${testId}-settings-dialog`}
      />
    </div>
  )
}

export default SpaceDetail
