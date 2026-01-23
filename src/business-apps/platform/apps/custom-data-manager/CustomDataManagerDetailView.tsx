import React from 'react'
import {
  PageLayout,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { ArrowLeft, Database, Edit2, Link as LinkIcon, Rocket, Settings } from 'lucide-react'
import type { CustomDataDefinition, EntityRelationship } from './types'
import { SchemaPreview } from './components/SchemaPreview'
import { RelationshipManager } from './components/RelationshipManager'

interface CustomDataManagerDetailViewProps {
  definition: CustomDataDefinition
  definitions: CustomDataDefinition[]
  detailTab: 'schema' | 'relationships' | 'settings'
  onChangeTab: (tab: 'schema' | 'relationships' | 'settings') => void
  onBack: () => void
  onEdit: () => void
  onOpenPromote: () => void
  onCreateRelationship: (relationship: EntityRelationship) => Promise<void>
  'data-testid'?: string
}

export const CustomDataManagerDetailView: React.FC<CustomDataManagerDetailViewProps> = ({
  definition,
  definitions,
  detailTab,
  onChangeTab,
  onBack,
  onEdit,
  onOpenPromote,
  onCreateRelationship,
  'data-testid': testId = 'custom-data-manager-detail'
}) => {
  return (
    <PageLayout
      headerIcon={Database}
      headerTitle={definition.display_name || definition.key}
      headerDescription={definition.description || 'Entity definition'}
      className="gba:min-h-screen"
    >
      <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
            <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-2" />
            Back to Definitions
          </Button>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant="secondary" className="gba:gap-1">
              <Database className="gba:h-3 gba:w-3" />
              {definition.kind}
            </Badge>
            <Badge variant={definition.publish_state === 'PROMOTED_TRACKED' ? 'success' : 'warning'}>
              {definition.publish_state === 'PROMOTED_TRACKED' ? 'Promoted' : 'Draft'}
            </Badge>
          </div>
        </div>

        <Tabs value={detailTab} onValueChange={val => onChangeTab(val as any)}>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <TabsList>
              <TabsTrigger value="schema" className="gba:flex gba:items-center gba:gap-1">
                <Database className="gba:h-4 gba:w-4" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="relationships" className="gba:flex gba:items-center gba:gap-1">
                <LinkIcon className="gba:h-4 gba:w-4" />
                Relationships
              </TabsTrigger>
              <TabsTrigger value="settings" className="gba:flex gba:items-center gba:gap-1">
                <Settings className="gba:h-4 gba:w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="gba:flex gba:items-center gba:gap-2">
              {detailTab === 'settings' && definition.publish_state !== 'PROMOTED_TRACKED' && (
                <Button variant="default" size="sm" onClick={onOpenPromote} data-testid={`${testId}-promote`}>
                  <Rocket className="gba:h-4 gba:w-4 gba:mr-1" />
                  Promote
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onEdit} data-testid={`${testId}-edit`}>
                <Edit2 className="gba:h-4 gba:w-4 gba:mr-1" />
                Edit
              </Button>
            </div>
          </div>

          <TabsContent value="schema" className="gba:mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-lg">Schema Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <SchemaPreview columns={definition.columns_json || []} data-testid={`${testId}-schema-preview`} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships" className="gba:mt-0">
            <RelationshipManager
              currentEntity={definition}
              availableEntities={definitions}
              onCreateRelationship={onCreateRelationship}
              data-testid={`${testId}-relationship-manager`}
            />
          </TabsContent>

          <TabsContent value="settings" className="gba:mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-lg">Definition Settings</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Key</span>
                    <p className="gba:font-mono gba:text-sm">{definition.key}</p>
                  </div>
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Type</span>
                    <p className="gba:text-sm">{definition.kind}</p>
                  </div>
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Status</span>
                    <p className="gba:text-sm">{definition.publish_state}</p>
                  </div>
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Columns</span>
                    <p className="gba:text-sm">{definition.columns_json?.length || 0} fields</p>
                  </div>
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Created</span>
                    <p className="gba:text-sm">{new Date(definition.created_at).toLocaleString()}</p>
                  </div>
                  <div className="gba:space-y-1">
                    <span className="gba:text-sm gba:text-muted-foreground">Updated</span>
                    <p className="gba:text-sm">{new Date(definition.updated_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="gba:pt-4 gba:border-t gba:border-border">
                  <h4 className="gba:text-sm gba:font-medium gba:mb-3">PostgreSQL Deployment</h4>
                  {definition.publish_state === 'PROMOTED_TRACKED' ? (
                    <Alert className="gba:bg-success-secondary gba:border-success">
                      <AlertDescription className="gba:text-success-secondary-foreground">
                        <div className="gba:space-y-1">
                          <p className="gba:font-medium">Entity is deployed</p>
                          <p className="gba:text-xs">
                            Table: <span className="gba:font-mono">{definition.deploy_state?.tableName}</span>
                          </p>
                          {definition.deploy_state?.deployedAt && (
                            <p className="gba:text-xs">
                              Deployed: {new Date(definition.deploy_state.deployedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="gba:flex gba:items-center gba:justify-between gba:bg-muted/50 gba:rounded-lg gba:p-4">
                      <div>
                        <p className="gba:text-sm gba:font-medium">Ready to deploy</p>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          Promote this entity to create a native PostgreSQL table
                        </p>
                      </div>
                      <Button onClick={onOpenPromote} data-testid={`${testId}-settings-promote`}>
                        <Rocket className="gba:h-4 gba:w-4 gba:mr-2" />
                        Promote
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
