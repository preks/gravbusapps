import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import { PiPlus, PiMapPin, PiTable, PiTrash, PiPencil } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import TravelRegionSetModal from './TravelRegionSetModal'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
}

interface TravelRegionSet {
  id: string
  code: string
  value: string
  description?: string
  parentCatalogEntryId?: string // Country ID
  childCount?: number
  hasDetails?: boolean // Whether this set has allowance rule details defined
  childRegionIds?: string[] // IDs of child travel regions for cascade delete
}

interface TravelRegionSetCardViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onSelectSet: (setId: string, setName: string) => void
  onViewUnassigned: () => void
}

const TravelRegionSetCardView: React.FC<TravelRegionSetCardViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  onSelectSet,
  onViewUnassigned
}) => {
  const [travelRegionSets, setTravelRegionSets] = useState<TravelRegionSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false)
  const [editingSet, setEditingSet] = useState<TravelRegionSet | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; set: TravelRegionSet | null }>({
    isOpen: false,
    set: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  // Initialize expense settings client with access token
  expenseSettingsClient.setAccessToken(accessToken)

  const loadTravelRegionSets = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use GraphQL to fetch TravelRegionSet entries with childEntriesAggregate for count
      const query = `
        query GetTravelRegionSets {
          CatalogEntry(
            where: { 
              catalog: { 
                identifier: { _eq: "TravelRegionSet" }, 
                version: { _eq: "v1" } 
              },
              isDeleted: { _eq: false }
            }
            orderBy: { code: ASC }
          ) {
            id
            code
            value
            description
            parentEntryId
            childEntriesAggregate(
              where: { 
                isDeleted: { _eq: false },
                catalog: { 
                  identifier: { _eq: "TravelRegion" }, 
                  version: { _eq: "v1" } 
                }
              }
            ) {
              aggregate {
                count
              }
            }
            childEntries(
              where: { 
                isDeleted: { _eq: false },
                catalog: { 
                  identifier: { _eq: "TravelRegion" }, 
                  version: { _eq: "v1" } 
                }
              }
            ) {
              id
            }
          }
        }
      `

      const result = await graphqlClient.request<{ CatalogEntry: any[] }>(query)

      console.log('🔍 Checking travel region sets for details:', {
        totalSets: result.CatalogEntry.length,
        setIds: result.CatalogEntry.map((s: any) => s.id)
      })

      // Check each set for rules with details by querying AllowanceRegionRule.travel_region_set_ref
      const setsWithDetails = new Map<string, { hasDetails: boolean; ruleCount: number; detailCount: number }>()

      for (const set of result.CatalogEntry) {
        const setId = set.id // e.g., "TravelRegionSet:v1:TRS_DE"

        const rulesQuery = `
          query CheckSetRules($setId: String!) {
            AllowanceRegionRule(
              where: {
                isDeleted: { _eq: false }
                travelRegionSetRef: { _eq: $setId }
              }
            ) {
              id
              allowanceRegionRuleDetailAggregate(
                where: { isDeleted: { _eq: false } }
              ) {
                aggregate {
                  count
                }
              }
            }
          }
        `

        const rulesResult = await graphqlClient.request<{ AllowanceRegionRule: any[] }>(rulesQuery, {
          setId
        })

        const ruleCount = rulesResult.AllowanceRegionRule.length
        const detailCount = rulesResult.AllowanceRegionRule.reduce(
          (sum, rule) => sum + (rule.allowanceRegionRuleDetailAggregate?.aggregate?.count || 0),
          0
        )
        const hasDetails = detailCount > 0

        setsWithDetails.set(setId, { hasDetails, ruleCount, detailCount })

        console.log(`🔍 Set "${set.value}" (${set.code}, ${setId}):`, {
          ruleCount,
          detailCount,
          hasDetails
        })
      }

      const sets: TravelRegionSet[] = result.CatalogEntry.map((item: any) => {
        // Get child region IDs for cascade delete
        const childRegionIds = item.childEntries?.map((child: any) => child.id) || []

        // Check if this set has rules with details
        const setInfo = setsWithDetails.get(item.id) || { hasDetails: false, ruleCount: 0, detailCount: 0 }
        const hasDetails = setInfo.hasDetails

        console.log(`🔍 Final Set "${item.value}" (${item.code}):`, {
          childCount: item.childEntriesAggregate?.aggregate?.count || 0,
          hasDetails,
          ruleCount: setInfo.ruleCount,
          detailCount: setInfo.detailCount,
          sampleChildIds: childRegionIds.slice(0, 3)
        })

        return {
          id: item.id,
          code: item.code,
          value: item.value,
          description: item.description,
          parentCatalogEntryId: item.parentEntryId, // Include parent country ID for editing
          // Get childCount from GraphQL aggregate
          childCount: item.childEntriesAggregate?.aggregate?.count || 0,
          hasDetails,
          childRegionIds
        }
      })

      setTravelRegionSets(sets)
    } catch (err) {
      console.error('Error loading travel region sets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load travel region sets')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient])

  useEffect(() => {
    if (accessToken) {
      loadTravelRegionSets()
    }
  }, [accessToken, loadTravelRegionSets])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96">
        <div className="gba:text-gray-500">Loading travel region sets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="gba:max-w-md gba:mx-auto">
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div className="gba:font-medium gba:mb-1">Error Loading Travel Region Sets</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={loadTravelRegionSets}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  const handleSetSelect = (set: TravelRegionSet) => {
    onSelectSet(set.id, set.value)
  }

  const handleCreateTravelRegionSet = () => {
    setIsCreateFormVisible(true)
  }

  const handleCreateFormClose = () => {
    setIsCreateFormVisible(false)
    setEditingSet(null)
  }

  const handleCreateFormSave = () => {
    // Refresh the list to show the newly created/updated set
    loadTravelRegionSets()
    const message = editingSet ? 'Travel Region Set updated successfully' : 'Travel Region Set created successfully'
    toast(message, 'success')
    setEditingSet(null)
  }

  const handleEditClick = (set: TravelRegionSet, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setEditingSet(set)
    setIsCreateFormVisible(true)
  }

  const handleDeleteClick = (set: TravelRegionSet, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setDeleteConfirmation({ isOpen: true, set })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, set: null })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.set) return

    setIsDeleting(true)
    try {
      const { set } = deleteConfirmation
      const childCount = set.childCount || 0

      console.log('🗑️ Starting delete for set:', {
        setId: set.id,
        setCode: set.code,
        childCount,
        hasDetails: set.hasDetails
      })

      // Step 1: Check for AllowanceRegionRule records that reference this set (including soft-deleted ones)
      console.log(`🔍 Fetching ALL AllowanceRegionRule records (including soft-deleted) for set ${set.id}...`)

      const allRulesQuery = `
        query GetAllRulesForSet($setId: String!) {
          AllowanceRegionRule(where: { travelRegionSetRef: { _eq: $setId } }) {
            id
            version
            travelRegionSetRef
            isDeleted
          }
        }
      `

      const allRulesResult = await graphqlClient.request<any>(allRulesQuery, {
        setId: set.id
      })

      const allRules = allRulesResult.AllowanceRegionRule || []
      console.log(
        `📊 Found ${allRules.length} total rules (${allRules.filter((r: any) => r.isDeleted).length} soft-deleted)`
      )

      // Step 2: For each rule, hard delete all its details first, then delete the rule
      for (const rule of allRules) {
        console.log(`🔍 Processing rule ${rule.id}...`)

        // Get all details for this rule (including soft-deleted ones)
        const allDetailsQuery = `
          query GetAllDetailsForRule($ruleId: uuid!) {
            AllowanceRegionRuleDetail(where: { allowanceRegionRuleId: { _eq: $ruleId } }) {
              id
              version
              allowanceRegionRuleId
              isDeleted
            }
          }
        `

        const allDetailsResult = await graphqlClient.request<any>(allDetailsQuery, {
          ruleId: rule.id
        })

        const allDetails = allDetailsResult.AllowanceRegionRuleDetail || []
        console.log(
          `📊 Rule ${rule.id} has ${allDetails.length} details (${allDetails.filter((d: any) => d.isDeleted).length} soft-deleted)`
        )

        // Hard delete all details
        for (const detail of allDetails) {
          console.log(`🗑️ Hard deleting detail ${detail.id}...`)
          try {
            await expenseSettingsClient.deleteAllowanceRegionRuleDetail({
              id: detail.id,
              version: detail.version
            })
            console.log(`✅ Hard deleted detail ${detail.id}`)
          } catch (err: any) {
            console.error(`❌ Failed to hard delete detail ${detail.id}:`, err)
            throw new Error(`Failed to hard delete detail ${detail.id}: ${err?.message || 'Unknown error'}`)
          }
        }

        // Hard delete the rule
        console.log(`🗑️ Hard deleting rule ${rule.id}...`)
        try {
          await expenseSettingsClient.deleteAllowanceRegionRule(rule.id, rule.version)
          console.log(`✅ Hard deleted rule ${rule.id}`)
        } catch (err: any) {
          console.error(`❌ Failed to hard delete rule ${rule.id}:`, err)
          throw new Error(`Failed to hard delete rule ${rule.id}: ${err?.message || 'Unknown error'}`)
        }
      }

      if (allRules.length > 0) {
        console.log(`✅ Hard deleted ${allRules.length} rules and their details`)
      } else {
        console.log('✅ No rules to delete')
      }

      // Step 3: Hard delete all child travel regions (DELETE endpoint will physically remove them)
      if (childCount > 0 && set.childRegionIds && set.childRegionIds.length > 0) {
        console.log(`🗑️ Hard deleting ${set.childRegionIds.length} child travel regions...`)
        console.log('Child region IDs:', set.childRegionIds)

        for (const regionId of set.childRegionIds) {
          console.log(`🗑️ Hard deleting child region: ${regionId}`)
          try {
            // Extract the short ID for the DELETE endpoint
            // Format: "TravelRegion:v1:02" -> use "02"
            const entryIdParts = regionId.split(':')
            const shortId = entryIdParts.length >= 3 ? entryIdParts[2] : regionId

            console.log(`  Hard deleting with ID: ${shortId}`)
            const result = await catalogClient.deleteCatalogEntry('TravelRegion', 'v1', shortId)
            console.log(`✅ Hard deleted region ${regionId}:`, result)
          } catch (err: any) {
            console.error(`❌ Failed to hard delete region ${regionId}:`, {
              error: err,
              message: err?.message,
              status: err?.status,
              response: err?.response,
              data: err?.response?.data
            })
            throw new Error(`Failed to hard delete child region ${regionId}: ${err?.message || 'Unknown error'}`)
          }
        }

        console.log(`✅ Hard deleted ${set.childRegionIds.length} child travel regions`)
      }

      // Step 4: Hard delete the travel region set (DELETE endpoint will physically remove it)
      console.log('🗑️ Hard deleting travel region set:', set.id)
      // Extract the short ID for the DELETE endpoint
      // Format: "TravelRegionSet:v1:Miahela Test" -> use "Miahela Test"
      const setIdParts = set.id.split(':')
      const shortSetId = setIdParts.length >= 3 ? setIdParts.slice(2).join(':') : set.id

      console.log(`  Hard deleting set with ID: ${shortSetId}`)
      const setDeleteResult = await catalogClient.deleteCatalogEntry('TravelRegionSet', 'v1', shortSetId)
      console.log('✅ Hard deleted travel region set:', setDeleteResult)

      const message =
        childCount > 0
          ? `Travel Region Set "${set.value}" and ${childCount} travel region${childCount > 1 ? 's' : ''} deleted successfully`
          : `Travel Region Set "${set.value}" deleted successfully`

      toast(message, 'success')

      // Close dialog and refresh list
      setDeleteConfirmation({ isOpen: false, set: null })
      loadTravelRegionSets()
    } catch (err) {
      console.error('❌ Error deleting travel region set:', err)
      toast(`Failed to delete Travel Region Set: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div data-testid={`${prefixDataTestId}-travel-region-sets-view`} className="gba:p-6">
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-2xl gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_sets', 'Travel Region Sets')}
            </h3>
            <p className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'expense-settings:travel_region_sets_description',
                'Manage travel regions and their allowance rules'
              )}
            </p>
          </div>
          <div className="gba:flex gba:gap-3">
            <Button
              variant="outline"
              onClick={onViewUnassigned}
              data-testid={`${prefixDataTestId}-view-unassigned-button`}
            >
              <PiTable className="gba:w-4 gba:h-4 gba:mr-2" />
              View Unassigned Rules
            </Button>
            <Button
              variant="default"
              onClick={handleCreateTravelRegionSet}
              data-testid={`${prefixDataTestId}-add-travel-region-set-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Travel Region Set
            </Button>
          </div>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 gba:gap-4">
        {travelRegionSets.map(set => (
          <Card
            key={set.id}
            className="gba:cursor-pointer gba:h-full hover:gba:shadow-lg gba:transition-shadow"
            data-testid={`${prefixDataTestId}-travel-region-set-card-${set.id}`}
            onClick={() => handleSetSelect(set)}
          >
            <CardHeader className="gba:flex gba:flex-row gba:items-center gba:space-y-0 gba:pb-3">
              <div className="gba:w-12 gba:h-12 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mr-4">
                <PiMapPin className="gba:text-blue-600 gba:text-xl" />
              </div>
              <div className="gba:flex-1">
                <CardTitle className="gba:text-lg gba:font-semibold">{set.value}</CardTitle>
                <p className="gba:text-sm gba:text-gray-500">{set.code}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {set.description && <p className="gba:text-sm gba:text-gray-600">{set.description}</p>}
                <div className="gba:flex gba:items-center gba:justify-between">
                  <Badge variant="secondary" className="gba:text-xs">
                    {set.childCount || 0} travel regions
                  </Badge>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleSetSelect(set)
                      }}
                      data-testid={`${prefixDataTestId}-view-matrix-button-${set.id}`}
                    >
                      <PiMapPin className="gba:w-4 gba:h-4 gba:mr-1" />
                      View Matrix
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => handleEditClick(set, e)}
                      data-testid={`${prefixDataTestId}-edit-set-button-${set.id}`}
                      className="hover:gba:bg-accent"
                      title="Edit travel region set"
                    >
                      <PiPencil className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => handleDeleteClick(set, e)}
                      disabled={set.hasDetails}
                      data-testid={`${prefixDataTestId}-delete-set-button-${set.id}`}
                      className={
                        set.hasDetails
                          ? 'gba:cursor-not-allowed'
                          : 'gba:text-destructive hover:gba:text-destructive hover:gba:bg-destructive-secondary'
                      }
                      title={
                        set.hasDetails
                          ? 'Cannot delete - this set has allowance rule details defined'
                          : 'Delete travel region set'
                      }
                    >
                      <PiTrash className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </div>
                {set.hasDetails && (
                  <div className="gba:mt-2">
                    <Badge variant="secondary" className="gba:text-xs gba:bg-info-secondary gba:text-info">
                      In use - cannot delete
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {travelRegionSets.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <PiMapPin className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <h4 className="gba:text-lg gba:font-medium gba:text-gray-600 gba:mb-2">No Travel Region Sets Found</h4>
          <p className="gba:text-gray-500 gba:mb-4">
            Create your first travel region set to start organizing your travel allowance rules.
          </p>
          <Button variant="default" onClick={handleCreateTravelRegionSet}>
            <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
            Create Travel Region Set
          </Button>
        </div>
      )}

      {/* Travel Region Set Creation/Edit Modal */}
      <TravelRegionSetModal
        accessToken={accessToken}
        isVisible={isCreateFormVisible}
        onCancel={handleCreateFormClose}
        onSave={handleCreateFormSave}
        editingSet={editingSet}
        prefixDataTestId={`${prefixDataTestId}-${editingSet ? 'edit' : 'create'}-travel-region-set`}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent data-testid={`${prefixDataTestId}-delete-confirmation-dialog`}>
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'expense-settings:delete_travel_region_set',
                'Delete Travel Region Set'
              )}
            </DialogTitle>
            <DialogDescription>
              {deleteConfirmation.set && (
                <div className="gba:space-y-2">
                  <p>
                    Are you sure you want to delete the travel region set{' '}
                    <span className="gba:font-semibold">"{deleteConfirmation.set.value}"</span>?
                  </p>
                  {/* Show cascade delete warning if there are child regions without details */}
                  {deleteConfirmation.set.childCount &&
                    deleteConfirmation.set.childCount > 0 &&
                    !deleteConfirmation.set.hasDetails && (
                      <Alert variant="default" className="gba:bg-warning-secondary gba:text-warning gba:border-warning">
                        <AlertDescription>
                          <p className="gba:font-medium gba:mb-1">⚠️ Cascade Delete</p>
                          <p>
                            This will also delete <strong>{deleteConfirmation.set.childCount}</strong> travel region
                            {deleteConfirmation.set.childCount > 1 ? 's' : ''} within this set.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  {/* Show error if has details */}
                  {deleteConfirmation.set.hasDetails && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <p className="gba:font-medium gba:mb-1">❌ Cannot Delete</p>
                        <p>
                          This travel region set has allowance rule details defined. You must remove all rule details
                          before deleting this set.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                  {!deleteConfirmation.set.hasDetails && (
                    <p className="gba:text-sm gba:text-muted-foreground">This action cannot be undone.</p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              data-testid={`${prefixDataTestId}-delete-cancel-button`}
            >
              {getTranslationFromI18nKeyAndLabel('expense-settings:cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || deleteConfirmation.set?.hasDetails}
              data-testid={`${prefixDataTestId}-delete-confirm-button`}
            >
              {isDeleting
                ? getTranslationFromI18nKeyAndLabel('expense-settings:deleting', 'Deleting...')
                : getTranslationFromI18nKeyAndLabel('expense-settings:delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TravelRegionSetCardView
