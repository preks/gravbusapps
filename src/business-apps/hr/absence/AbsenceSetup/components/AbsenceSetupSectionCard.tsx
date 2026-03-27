import { useEffect, useMemo, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, Info, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import type { SetupSectionItem } from '../utils/absenceSetup'
import translations from '../_i18n'

interface AbsenceSetupSectionCardProps {
  icon: LucideIcon
  title: string
  description: string
  addLabel: string
  editLabel: string
  deleteLabel: string
  loadingLabel: string
  emptyLabel: string
  errorTitle: string
  errorMessage?: string
  items: SetupSectionItem[]
  isLoading?: boolean
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  addButtonTestId: string
  cardTestId: string
  showDeleteAction?: boolean
}

export const AbsenceSetupSectionCard: React.FC<AbsenceSetupSectionCardProps> = ({
  icon: Icon,
  title,
  description,
  addLabel,
  editLabel,
  deleteLabel,
  loadingLabel,
  emptyLabel,
  errorTitle,
  errorMessage,
  items,
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
  addButtonTestId,
  cardTestId,
  showDeleteAction = true
}) => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedItemId, setSelectedItemId] = useState('')

  const filteredItems = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    return [...items]
      .filter(item => {
        if (statusFilter === 'active' && item.statusValue !== 'active') {
          return false
        }

        if (statusFilter === 'inactive' && item.statusValue !== 'inactive') {
          return false
        }

        if (!normalizedSearchTerm) {
          return true
        }

        const haystack = [item.title, item.description, item.searchText, item.sortText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedSearchTerm)
      })
      .sort((leftItem, rightItem) => {
        const leftValue = (leftItem.sortText || leftItem.title).toLowerCase()
        const rightValue = (rightItem.sortText || rightItem.title).toLowerCase()
        const result = leftValue.localeCompare(rightValue)

        return sortOrder === 'asc' ? result : -result
      })
  }, [items, searchTerm, sortOrder, statusFilter])

  const selectedItem = useMemo(
    () => filteredItems.find(item => item.id === selectedItemId) || filteredItems[0] || null,
    [filteredItems, selectedItemId]
  )

  useEffect(() => {
    if (!selectedItem) {
      setSelectedItemId('')
      return
    }

    if (selectedItem.id !== selectedItemId) {
      setSelectedItemId(selectedItem.id)
    }
  }, [selectedItem, selectedItemId])

  return (
    <Card
      data-testid={cardTestId}
      className="gba:w-full gba:min-w-0 gba:overflow-hidden gba:border gba:border-border gba:bg-card"
    >
      <CardHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-6 gba:py-5">
        <div className="gba:flex gba:flex-col gba:gap-4 gba:lg:flex-row gba:lg:items-start gba:lg:justify-between">
          <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-4">
            <div className="gba:flex gba:h-11 gba:w-11 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-background">
              <Icon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
            </div>
            <div className="gba:min-w-0 gba:flex-1 gba:space-y-1">
              <CardTitle className="gba:text-xl gba:font-semibold">{title}</CardTitle>
              <CardDescription className="gba:max-w-4xl gba:text-sm">{description}</CardDescription>
            </div>
          </div>

          <div className="gba:flex gba:w-full gba:justify-start gba:lg:w-auto gba:justify-self-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onAdd}
              data-testid={addButtonTestId}
              className="gba:w-full gba:gap-2 gba:lg:w-auto"
            >
              <Plus className="gba:h-4 gba:w-4" />
              {addLabel}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-3 gba:p-6">
        {isLoading && (
          <div
            className="gba:flex gba:min-h-32 gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20"
            data-testid={`${cardTestId}-loading`}
          >
            <Spinner />
            <p className="gba:text-sm gba:text-muted-foreground">{loadingLabel}</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <Alert variant="destructive" data-testid={`${cardTestId}-error`}>
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !errorMessage && items.length === 0 && (
          <EmptyState
            title={title}
            description={emptyLabel}
            className="gba:min-h-40 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:py-10"
            data-testid={`${cardTestId}-empty`}
          />
        )}

        {!isLoading && !errorMessage && items.length > 0 && (
          <div className="gba:space-y-4">
            <div className="gba:flex gba:flex-col gba:gap-3 gba:xl:flex-row gba:xl:items-center gba:xl:justify-between">
              <DebouncedInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('section-search-placeholder', { entity: title })}
                className="gba:w-full gba:xl:max-w-md"
                data-testid={`${cardTestId}-search-input`}
              />
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'secondary'}
                  onClick={() => setStatusFilter('all')}
                  data-testid={`${cardTestId}-filter-all-button`}
                >
                  {t('filter-all-label')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'active' ? 'default' : 'secondary'}
                  onClick={() => setStatusFilter('active')}
                  data-testid={`${cardTestId}-filter-active-button`}
                >
                  {t('status-active')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'inactive' ? 'default' : 'secondary'}
                  onClick={() => setStatusFilter('inactive')}
                  data-testid={`${cardTestId}-filter-inactive-button`}
                >
                  {t('status-inactive')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSortOrder(current => (current === 'asc' ? 'desc' : 'asc'))}
                  data-testid={`${cardTestId}-sort-button`}
                  className="gba:gap-2"
                >
                  {sortOrder === 'asc' ? (
                    <ArrowDownAZ className="gba:h-4 gba:w-4" />
                  ) : (
                    <ArrowUpAZ className="gba:h-4 gba:w-4" />
                  )}
                  {t(sortOrder === 'asc' ? 'sort-a-to-z-label' : 'sort-z-to-a-label')}
                </Button>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:text-muted-foreground">
              <span data-testid={`${cardTestId}-results-count`}>
                {t('section-results-count', { count: String(filteredItems.length), total: String(items.length) })}
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <EmptyState
                title={t('section-no-results-title')}
                description={t('section-no-results-description')}
                className="gba:min-h-40 gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:py-10"
                data-testid={`${cardTestId}-no-results`}
              />
            ) : (
              <div className="gba:grid gba:gap-4 gba:xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <div className="gba:space-y-3" data-testid={`${cardTestId}-list`}>
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`gba:flex gba:w-full gba:flex-wrap gba:items-start gba:justify-between gba:gap-4 gba:rounded-xl gba:border gba:p-4 gba:text-left gba:transition-colors ${
                        item.id === selectedItem?.id
                          ? 'gba:border-primary gba:bg-primary/5'
                          : 'gba:border-border gba:bg-background hover:gba:bg-muted/30'
                      } ${item.canEdit === false ? 'gba:opacity-80' : ''}`}
                      data-testid={`${cardTestId}-item-${item.id}`}
                    >
                      <div className="gba:min-w-0 gba:flex-1 gba:space-y-1">
                        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                          <p className="gba:font-medium gba:text-foreground">{item.title}</p>
                          {item.statusLabel ? <Badge variant="outline">{item.statusLabel}</Badge> : null}
                        </div>
                        {item.highlights?.length ? (
                          <div className="gba:flex gba:flex-wrap gba:gap-2">
                            {item.highlights.map(highlight => (
                              <div
                                key={`${item.id}-${highlight.label}`}
                                className="gba:flex gba:items-center gba:gap-2 gba:rounded-full gba:border gba:border-border gba:bg-muted/20 gba:px-2.5 gba:py-1 gba:text-xs gba:text-muted-foreground"
                              >
                                <span className="gba:font-medium">{highlight.label}:</span>
                                <span>{highlight.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p className="gba:text-sm gba:text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={event => {
                            event.stopPropagation()
                            onEdit(item.id)
                          }}
                          disabled={item.canEdit === false}
                          data-testid={`${cardTestId}-edit-${item.id}`}
                        >
                          {editLabel}
                        </Button>
                        {showDeleteAction && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={event => {
                              event.stopPropagation()
                              onDelete(item.id)
                            }}
                            data-testid={`${cardTestId}-delete-${item.id}`}
                            className="gba:text-destructive gba:hover:text-destructive"
                          >
                            {deleteLabel}
                          </Button>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/10 gba:p-4"
                  data-testid={`${cardTestId}-details-panel`}
                >
                  {selectedItem ? (
                    <div className="gba:space-y-4">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-xl gba:bg-background">
                          <Info className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        </div>
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                            <p className="gba:text-base gba:font-semibold">{selectedItem.title}</p>
                            {selectedItem.statusLabel ? (
                              <Badge variant="outline">{selectedItem.statusLabel}</Badge>
                            ) : null}
                          </div>
                          <p className="gba:text-sm gba:text-muted-foreground">{selectedItem.description}</p>
                        </div>
                      </div>

                      <div className="gba:space-y-3">
                        {(selectedItem.fields || []).map(field => (
                          <div
                            key={`${selectedItem.id}-${field.label}`}
                            className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:bg-background gba:p-3"
                          >
                            <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                              {field.label}
                            </span>
                            <span className="gba:text-sm gba:text-foreground">
                              {field.value || t('details-empty-value')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title={t('details-panel-title')}
                      description={t('details-panel-empty-description')}
                      className="gba:min-h-40 gba:border-0 gba:bg-transparent"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AbsenceSetupSectionCard
