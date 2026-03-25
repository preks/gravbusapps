import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  PageLayout,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Badge
} from '@newwork/nw-design-system'
import { Database, Plus, Rocket, Sparkles } from 'lucide-react'
import type { CustomDataDefinition } from './types'
import { DefinitionsTable, BulkAction } from './components/DefinitionsTable'

interface CustomDataManagerListViewProps {
  definitions: CustomDataDefinition[]
  isLoadingDefinitions: boolean
  definitionsError: string | null
  entityCount: number
  promotedCount: number
  currentNamespace: string
  availableNamespaces: string[]
  onChangeNamespace: (namespace: string) => void
  onOpenCreateNamespace: () => void
  onOpenAiGenerator: () => void
  onCreateNew: () => void
  onSelectDefinition: (definition: CustomDataDefinition) => void
  onEditDefinition: (definition: CustomDataDefinition) => void
  onOpenPromote: (definition: CustomDataDefinition) => void
  onBulkAction: (action: BulkAction) => void
  'data-testid'?: string
}

export const CustomDataManagerListView: React.FC<CustomDataManagerListViewProps> = ({
  definitions,
  isLoadingDefinitions,
  definitionsError,
  entityCount,
  promotedCount,
  currentNamespace,
  availableNamespaces,
  onChangeNamespace,
  onOpenCreateNamespace,
  onOpenAiGenerator,
  onCreateNew,
  onSelectDefinition,
  onEditDefinition,
  onOpenPromote,
  onBulkAction,
  'data-testid': testId = 'custom-data-manager-list'
}) => {
  return (
    <PageLayout
      headerIcon={Database}
      headerTitle={getTranslationFromI18nKeyAndLabel('customData.title', 'Custom Data Manager')}
      headerDescription="Create and manage custom data schemas"
      className="gba:min-h-screen"
    >
      <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:mb-6">
          <Card>
            <CardContent className="gba:pt-6">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <p className="gba:text-2xl gba:font-bold">{entityCount}</p>
                  <p className="gba:text-sm gba:text-muted-foreground">Entities</p>
                </div>
                <Database className="gba:h-8 gba:w-8 gba:text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:pt-6">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <p className="gba:text-2xl gba:font-bold">{promotedCount}</p>
                  <p className="gba:text-sm gba:text-muted-foreground">Promoted</p>
                </div>
                <Rocket className="gba:h-8 gba:w-8 gba:text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center gba:gap-4">
            <h2 className="gba:text-lg gba:font-semibold">Definitions</h2>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Select value={currentNamespace} onValueChange={onChangeNamespace}>
                <SelectTrigger className="gba:w-64" data-testid={`${testId}-namespace-selector`}>
                  <SelectValue placeholder="Select namespace" />
                </SelectTrigger>
                <SelectContent>
                  {availableNamespaces.map(ns => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onOpenCreateNamespace} data-testid={`${testId}-create-namespace`}>
                New namespace
              </Button>
            </div>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={onOpenAiGenerator} data-testid={`${testId}-ai-generator`}>
              <Sparkles className="gba:h-4 gba:w-4 gba:mr-2" />
              Generate with AI
            </Button>
            <Button onClick={onCreateNew} data-testid={`${testId}-create-new`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              New Definition
            </Button>
          </div>
        </div>

        {definitionsError && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertDescription>{definitionsError}</AlertDescription>
          </Alert>
        )}

        {definitions.some(d => d.namespace === 'default') && definitions.length > 0 && (
          <Alert variant="info" className="gba:mb-4" data-testid={`${testId}-namespace-info`}>
            <AlertDescription>
              <div className="gba:flex gba:items-start gba:gap-3">
                <Database className="gba:h-5 gba:w-5 gba:text-info-foreground gba:flex-shrink-0 gba:mt-0.5" />
                <div>
                  <p className="gba:font-medium gba:text-info-foreground gba:mb-1">Namespace Support Now Available</p>
                  <p className="gba:text-sm gba:text-info-secondary-foreground">
                    Your existing data sources have been migrated to the{' '}
                    <Badge variant="secondary" className="gba:mx-1">
                      default
                    </Badge>{' '}
                    namespace. You can now organize data sources using namespaces for better isolation. Use the
                    namespace selector above to filter by namespace, or create new definitions in custom namespaces.
                  </p>
                  <ul className="gba:list-disc gba:ml-4 gba:mt-2 gba:text-sm gba:text-info-secondary-foreground gba:space-y-1">
                    <li>Keys must be unique within a namespace (same key allowed in different namespaces)</li>
                    <li>
                      Use reverse domain notation: <code className="gba:text-xs">com.company.department</code>
                    </li>
                    <li>Namespaces provide isolation for multi-tenant or multi-project scenarios</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="gba:pt-6">
            <DefinitionsTable
              definitions={definitions}
              isLoading={isLoadingDefinitions}
              onSelect={onSelectDefinition}
              onEdit={onEditDefinition}
              onPromote={onOpenPromote}
              onBulkAction={onBulkAction}
              data-testid={`${testId}-definitions-table`}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
