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
  Spinner
} from '@newwork/nw-design-system'
import type { SetupSectionItem } from '../utils/absenceSetup'

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
              className="gba:w-full gba:lg:w-auto"
            >
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
          <div className="gba:space-y-3" data-testid={`${cardTestId}-list`}>
            {items.map(item => (
              <div
                key={item.id}
                className={`gba:flex gba:w-full gba:flex-wrap gba:items-start gba:justify-between gba:gap-4 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4 ${
                  item.canEdit === false ? 'gba:opacity-80' : ''
                }`}
                data-testid={`${cardTestId}-item-${item.id}`}
              >
                <div className="gba:min-w-0 gba:space-y-1">
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <p className="gba:font-medium gba:text-foreground">{item.title}</p>
                    {item.statusLabel ? <Badge variant="outline">{item.statusLabel}</Badge> : null}
                  </div>
                  <p className="gba:text-sm gba:text-muted-foreground">{item.description}</p>
                </div>
                <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item.id)}
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
                      onClick={() => onDelete(item.id)}
                      data-testid={`${cardTestId}-delete-${item.id}`}
                      className="gba:text-destructive gba:hover:text-destructive"
                    >
                      {deleteLabel}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AbsenceSetupSectionCard
