import { useEffect, useMemo, useRef, useState } from 'react'
import { InfoIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import type { SetupSectionHighlight, SetupSectionItem, SetupSectionSortOption } from '../utils/absenceSetup'
import { absenceTypeSetupIconMap } from '../utils/absenceTypeSetupIcons'
import translations from '../_i18n'

const isSupportedColorValue = (value: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())

const renderHighlightValue = (highlight: SetupSectionHighlight) => {
  if (highlight.display === 'icon') {
    const Icon = absenceTypeSetupIconMap[highlight.value as keyof typeof absenceTypeSetupIconMap]
    if (!Icon) {
      return null
    }

    return <Icon className="gba:h-4 gba:w-4" aria-hidden="true" />
  }

  if (highlight.display === 'color') {
    if (!isSupportedColorValue(highlight.value)) {
      return null
    }

    return (
      <svg className="gba:h-4 gba:w-4 gba:text-border" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="4" fill={highlight.value} stroke="currentColor" />
      </svg>
    )
  }

  return <span>{highlight.value}</span>
}

const compareSortValues = (
  leftValue: string | number | undefined,
  rightValue: string | number | undefined,
  direction: 'asc' | 'desc'
) => {
  const resolvedLeftValue = leftValue ?? ''
  const resolvedRightValue = rightValue ?? ''

  const result =
    typeof resolvedLeftValue === 'number' && typeof resolvedRightValue === 'number'
      ? resolvedLeftValue - resolvedRightValue
      : String(resolvedLeftValue).localeCompare(String(resolvedRightValue), undefined, {
          numeric: true,
          sensitivity: 'base'
        })

  return direction === 'desc' ? -result : result
}

interface AbsenceSetupSectionCardProps {
  icon: typeof PhosphorIcon
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
  onSelect?: (id: string) => void
  sortOptions?: SetupSectionSortOption[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  addButtonTestId: string
  cardTestId: string
  showAddAction?: boolean
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
  onSelect,
  sortOptions = [],
  onEdit,
  onDelete,
  addButtonTestId,
  cardTestId,
  showAddAction = true,
  showDeleteAction = true
}) => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [activeSortOptionId, setActiveSortOptionId] = useState(sortOptions[0]?.id || '')
  const lastNotifiedSelectionRef = useRef('')

  const activeSortOption = useMemo(
    () => sortOptions.find(option => option.id === activeSortOptionId) || sortOptions[0],
    [activeSortOptionId, sortOptions]
  )

  useEffect(() => {
    const nextSortOptionId = sortOptions[0]?.id || ''
    if (!sortOptions.some(option => option.id === activeSortOptionId)) {
      setActiveSortOptionId(nextSortOptionId)
    }
  }, [activeSortOptionId, sortOptions])

  const filteredItems = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    return [...items]
      .filter(item => {
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
        const result = compareSortValues(
          activeSortOption ? leftItem.sortValues?.[activeSortOption.id] : leftItem.sortText || leftItem.title,
          activeSortOption ? rightItem.sortValues?.[activeSortOption.id] : rightItem.sortText || rightItem.title,
          activeSortOption?.direction || 'asc'
        )

        if (result !== 0) {
          return result
        }

        return String(leftItem.title).localeCompare(String(rightItem.title), undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      })
  }, [activeSortOption, items, searchTerm])

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

  useEffect(() => {
    if (!selectedItem?.id || !onSelect) {
      lastNotifiedSelectionRef.current = ''
      return
    }

    if (lastNotifiedSelectionRef.current === selectedItem.id) {
      return
    }

    lastNotifiedSelectionRef.current = selectedItem.id
    onSelect(selectedItem.id)
  }, [onSelect, selectedItem?.id])

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

          {showAddAction ? (
            <div className="gba:flex gba:w-full gba:justify-start gba:lg:w-auto gba:justify-self-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onAdd}
                data-testid={addButtonTestId}
                className="gba:w-full gba:gap-2 gba:lg:w-auto"
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
                {addLabel}
              </Button>
            </div>
          ) : null}
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
            <div className="gba:space-y-3">
              <div className="gba:flex gba:flex-col gba:gap-3 gba:md:flex-row gba:md:items-end gba:md:gap-4">
                <DebouncedInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={t('section-search-placeholder', { entity: title })}
                  containerClassName="gba:w-full gba:min-w-0 gba:md:w-auto gba:md:max-w-xl gba:md:flex-1"
                  className="gba:w-full"
                  icon={<MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                  data-testid={`${cardTestId}-search-input`}
                />
                {sortOptions.length ? (
                  <div className="gba:w-full gba:md:w-64 gba:space-y-1">
                    <Label htmlFor={`${cardTestId}-sort-select`}>{t('sort-by-label')}</Label>
                    <Select value={activeSortOption?.id || ''} onValueChange={setActiveSortOptionId}>
                      <SelectTrigger id={`${cardTestId}-sort-select`} data-testid={`${cardTestId}-sort-select`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(option => (
                          <SelectItem
                            key={`${cardTestId}-sort-option-${option.id}`}
                            value={option.id}
                            data-testid={`${cardTestId}-sort-option-${option.id}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <div className="gba:flex gba:items-center gba:text-sm gba:text-muted-foreground">
                <span data-testid={`${cardTestId}-results-count`}>
                  {t('section-results-count', { count: String(filteredItems.length), total: String(items.length) })}
                </span>
              </div>
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
                          : 'gba:border-border gba:bg-background gba:hover:bg-muted/30'
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
                            {item.highlights.map(highlight => {
                              const highlightValue = renderHighlightValue(highlight)
                              if (!highlightValue) {
                                return null
                              }

                              return (
                                <div
                                  key={`${item.id}-${highlight.label}`}
                                  className="gba:flex gba:items-center gba:gap-2 gba:rounded-full gba:border gba:border-border gba:bg-muted/20 gba:px-2.5 gba:py-1 gba:text-xs gba:text-muted-foreground"
                                >
                                  <span className="gba:font-medium">{highlight.label}:</span>
                                  {highlightValue}
                                </div>
                              )
                            })}
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
                          aria-label={editLabel}
                        >
                          <PencilSimpleIcon className="gba:h-4 gba:w-4" />
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
                            disabled={item.canDelete === false}
                            data-testid={`${cardTestId}-delete-${item.id}`}
                            className="gba:text-destructive gba:hover:text-destructive"
                            aria-label={deleteLabel}
                          >
                            <TrashIcon className="gba:h-4 gba:w-4" />
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
                          <InfoIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
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
