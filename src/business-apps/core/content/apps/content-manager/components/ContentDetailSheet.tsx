import React, { useMemo } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner
} from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { ContentArticleAnalyzer } from '@/business-apps/core/content/components/ContentArticleAnalyzer'
import { ContentImage } from '@/business-apps/core/content/apps/content-portal/components/shared/ContentImage'
import {
  CONTENT_GROUP_LABEL,
  ContentGroup,
  resolveContentCategoryName,
  resolveContentTagName,
  resolveContentTypeName
} from '@/common/data/content/constants/contentConstants'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

type ContentDetailSheetProps = {
  accessToken?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedContent: ContentEntry | null
  userId?: string
}

type DetailRowProps = {
  label: string
  value?: React.ReactNode
  children?: React.ReactNode
}

type ReactionCountItem = NonNullable<ContentEntry['contentEntryReactionCounts']>[number]

const contentGroupBadgeVariant: Record<string, BadgeVariant> = {
  [ContentGroup.NEWS]: 'default',
  [ContentGroup.KNOWLEDGE]: 'secondary',
  [ContentGroup.POLICY]: 'outline',
  [ContentGroup.DOCUMENT]: 'outline',
  [ContentGroup.QUESTION]: 'default'
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, children }) => (
  <div className="gba:grid gba:grid-cols-[140px_1fr] gba:gap-3 gba:py-2">
    <span className="gba:text-sm gba:text-muted-foreground">{label}</span>
    <div className="gba:min-w-0">{children ?? value ?? '-'}</div>
  </div>
)

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const formattedValue = dayjs(value)
  return formattedValue.isValid() ? formattedValue.format('MMM DD, YYYY HH:mm') : '-'
}

function getEmployeeName(
  nameSource?: { displayName?: string | null; firstName?: string | null } | null,
  fallback?: string | null
) {
  return nameSource?.displayName || nameSource?.firstName || fallback || '-'
}

function getValidityBadge(contentEntry: ContentEntry): { label: string; variant: BadgeVariant } {
  const now = dayjs()

  if (contentEntry.activeFrom && dayjs(contentEntry.activeFrom).isAfter(now)) {
    return { label: 'Scheduled', variant: 'secondary' }
  }

  if (contentEntry.activeTo && dayjs(contentEntry.activeTo).isBefore(now)) {
    return { label: 'Expired', variant: 'destructive' }
  }

  return { label: 'Active', variant: 'default' }
}

function renderReactionDisplay(reaction: ReactionCountItem) {
  const contentReaction = reaction.contentReaction
  if (!contentReaction) {
    return reaction.contentReactionRef
  }

  if (contentReaction.type === 'CUSTOM' && contentReaction.additionalValue3) {
    return (
      <img
        src={contentReaction.additionalValue3}
        alt={contentReaction.value || contentReaction.code || 'Custom reaction'}
        className="gba:h-4 gba:w-4 gba:rounded-sm gba:object-cover"
      />
    )
  }

  const reactionDescription =
    'description' in contentReaction && typeof contentReaction.description === 'string'
      ? contentReaction.description
      : undefined

  return reactionDescription || contentReaction.value || contentReaction.code || reaction.contentReactionRef
}

export const ContentDetailSheet: React.FC<ContentDetailSheetProps> = ({
  accessToken,
  open,
  onOpenChange,
  selectedContent,
  userId
}) => {
  const selectedContentId = selectedContent?.id || ''
  const queryOptions = useMemo(
    () => ({
      config: 'detail' as const,
      relationLimit: 50
    }),
    []
  )
  const {
    entry: detailContent,
    isLoading,
    error
  } = useContentEntry(selectedContentId, {
    accessToken,
    queryOptions
  })

  const contentEntry = detailContent ?? selectedContent

  const categoryNames = useMemo(() => {
    return (contentEntry?.contentEntryCategories ?? [])
      .map(contentEntryCategory => resolveContentCategoryName(contentEntryCategory.contentCategory))
      .filter(Boolean)
  }, [contentEntry])

  const tagNames = useMemo(() => {
    return (contentEntry?.contentEntryTags ?? [])
      .map(contentEntryTag => resolveContentTagName(contentEntryTag.contentTag))
      .filter(Boolean)
  }, [contentEntry])

  const topReactions = useMemo(() => {
    return [...(contentEntry?.contentEntryReactionCounts ?? [])]
      .sort((firstReaction, secondReaction) => secondReaction.count - firstReaction.count)
      .slice(0, 5)
  }, [contentEntry])

  const totalReactions = useMemo(() => {
    return (contentEntry?.contentEntryReactionCounts ?? []).reduce((sum, reaction) => sum + reaction.count, 0)
  }, [contentEntry])

  const totalComments = contentEntry?.descendantContentEntriesAggregate?.aggregate?.count ?? 0
  const contentTypeName = resolveContentTypeName(contentEntry?.contentType)
  const contentGroupKey = typeof contentEntry?.contentGroup === 'string' ? contentEntry.contentGroup : undefined
  const contentGroupLabel = contentGroupKey
    ? (CONTENT_GROUP_LABEL[contentGroupKey as ContentGroup] ?? contentGroupKey)
    : null
  const validityStatus = contentEntry ? getValidityBadge(contentEntry) : null
  const handleOpenEntry = () => {
    if (!contentEntry?.id) {
      return
    }

    navigateTo(buildPlatformUrl(Navigation.CONTENT_ENTRY_RECORD, { contentId: contentEntry.id }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gba:!w-[600px] gba:sm:!w-[600px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
            {contentEntry?.title || 'Content Details'}
          </SheetTitle>
        </SheetHeader>

        <div className="gba:flex-1 gba:min-h-0">
          {!contentEntry ? (
            <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:px-6 gba:text-center gba:text-muted-foreground">
              No content selected
            </div>
          ) : (
            <ScrollArea className="gba:h-full">
              <div className="gba:space-y-4 gba:px-6 gba:py-4">
                {isLoading && !detailContent ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-10">
                    <Spinner size="lg" />
                  </div>
                ) : null}

                {error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Failed to load full details</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ) : null}

                <Card>
                  <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-3">
                    <CardTitle>Overview</CardTitle>
                    {accessToken ? (
                      <div className="gba:shrink-0">
                        <ContentArticleAnalyzer
                          contentEntry={contentEntry}
                          accessToken={accessToken}
                          userId={userId}
                          buttonLabel="Analyze Article"
                        />
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="gba:space-y-4">
                    {contentEntry.picture && accessToken ? (
                      <ContentImage
                        picture={contentEntry.picture}
                        accessToken={accessToken}
                        alt={contentEntry.title || 'Content preview'}
                        className="gba:h-40 gba:w-full gba:rounded-md gba:border gba:border-border"
                        fallbackText="No image"
                        tone="default"
                      />
                    ) : null}

                    <div className="gba:min-w-0 gba:space-y-3">
                      <div className="gba:flex gba:flex-wrap gba:gap-2">
                        {contentGroupLabel ? (
                          <Badge variant={contentGroupBadgeVariant[contentGroupKey ?? ''] || 'outline'}>
                            {contentGroupLabel}
                          </Badge>
                        ) : null}
                        {contentTypeName ? <Badge variant="outline">{contentTypeName}</Badge> : null}
                      </div>

                      <p className="gba:text-sm gba:text-muted-foreground">
                        {contentEntry.preview || 'No preview available'}
                      </p>

                      <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:text-sm">
                        <div>
                          <span className="gba:text-muted-foreground">ID</span>
                          <p className="gba:mt-1 gba:break-all">{contentEntry.id || '-'}</p>
                        </div>
                        <div>
                          <span className="gba:text-muted-foreground">Version</span>
                          <p className="gba:mt-1">{contentEntry.version ?? contentEntry.entryVersion ?? '-'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle>Publication & Validity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow
                      label="Language"
                      value={contentEntry.language?.value || contentEntry.languageRef || '-'}
                    />
                    <Separator />
                    <DetailRow label="Status">
                      {validityStatus ? <Badge variant={validityStatus.variant}>{validityStatus.label}</Badge> : '-'}
                    </DetailRow>
                    <Separator />
                    <DetailRow label="Active from" value={formatDateTime(contentEntry.activeFrom)} />
                    <Separator />
                    <DetailRow label="Active to" value={formatDateTime(contentEntry.activeTo)} />
                    <Separator />
                    <DetailRow label="Accepted">
                      <Badge variant={contentEntry.accepted ? 'default' : 'outline'}>
                        {contentEntry.accepted ? 'Yes' : 'No'}
                      </Badge>
                    </DetailRow>
                    <Separator />
                    <DetailRow
                      label="Accepted by"
                      value={getEmployeeName(contentEntry.acceptorEmployee, contentEntry.acceptorEmployeeId)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle>Taxonomy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow
                      label="Categories"
                      value={categoryNames.length > 0 ? categoryNames.join(', ') : 'No categories assigned'}
                    />
                    <Separator />
                    <DetailRow label="Tags" value={tagNames.length > 0 ? tagNames.join(', ') : 'No tags assigned'} />
                    <Separator />
                    <DetailRow label="Documents" value={contentEntry.contentDocuments?.length ?? 0} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle>Interaction & Community</CardTitle>
                  </CardHeader>
                  <CardContent className="gba:space-y-4">
                    <div className="gba:flex gba:flex-wrap gba:gap-2">
                      <Badge variant={contentEntry.allowComment ? 'secondary' : 'outline'}>
                        {contentEntry.allowComment ? 'Comments on' : 'Comments off'}
                      </Badge>
                      <Badge variant={contentEntry.allowReaction ? 'secondary' : 'outline'}>
                        {contentEntry.allowReaction ? 'Reactions on' : 'Reactions off'}
                      </Badge>
                      <Badge variant={contentEntry.displayCreator ? 'secondary' : 'outline'}>
                        {contentEntry.displayCreator ? 'Creator visible' : 'Creator hidden'}
                      </Badge>
                      <Badge variant={contentEntry.displayUpdater ? 'secondary' : 'outline'}>
                        {contentEntry.displayUpdater ? 'Updater visible' : 'Updater hidden'}
                      </Badge>
                    </div>

                    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Total reactions</p>
                        <p className="gba:mt-1 gba:text-xl gba:font-semibold">{totalReactions}</p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-muted-foreground">Comment threads</p>
                        <p className="gba:mt-1 gba:text-xl gba:font-semibold">{totalComments}</p>
                      </div>
                    </div>

                    <div>
                      <p className="gba:text-sm gba:text-muted-foreground">Top reactions</p>
                      <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-2">
                        {topReactions.length > 0 ? (
                          topReactions.map(reaction => (
                            <Badge
                              key={reaction.contentReactionRef}
                              variant="outline"
                              className="gba:flex gba:items-center gba:gap-1.5"
                            >
                              <span className="gba:flex gba:items-center gba:justify-center">
                                {renderReactionDisplay(reaction)}
                              </span>
                              <span>{reaction.count}</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="gba:text-sm gba:text-muted-foreground">No reactions yet</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gba:pb-3">
                    <CardTitle>Authors & Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow
                      label="Created"
                      value={`${formatDateTime(contentEntry.createdAt)} by ${getEmployeeName(
                        contentEntry.creatorEmployee,
                        contentEntry.createdBy
                      )}`}
                    />
                    <Separator />
                    <DetailRow
                      label="Updated"
                      value={`${formatDateTime(contentEntry.updatedAt)} by ${getEmployeeName(
                        contentEntry.updaterEmployee,
                        contentEntry.updatedBy
                      )}`}
                    />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </div>

        <SheetFooter className="gba:mt-auto gba:flex gba:flex-col-reverse gba:gap-2 gba:border-t gba:border-border gba:px-6 gba:py-4 sm:gba:flex-row sm:gba:justify-end">
          {contentEntry?.id ? (
            <AppAction
              mode="button"
              contexts={[
                {
                  context: FlowContextName.contentEntryEntity,
                  contextData: {
                    contentEntryId: contentEntry.id
                  }
                }
              ]}
              accessToken={accessToken || ''}
              emptyState="hide"
              lazyLoad
              buttonVariant="outline"
              prefixDataTestId="content-detail-sheet-actions"
            >
              Edit
            </AppAction>
          ) : null}

          <Button variant="default" disabled={!contentEntry?.id} onClick={handleOpenEntry}>
            Open Entry
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
