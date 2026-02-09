import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { PiArrowLeft, PiPlus, PiWarning } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import MileageRulesPagination from '../mileage-rules/MileageRulesPagination'
import AllowanceRegionRuleForm from '../../forms/allowance-region-rule-form/AllowanceRegionRuleForm'
import { formatDate } from '../../utils'

interface UnassignedAllowanceRegionRule {
  id: string
  code: string
  name: string
  activeFrom: string
  activeTo?: string
  ruleOrder?: number
  detailCount: number
  version?: number
  additionalProperties?: any
  businessKey?: string
}

interface TravelRegionSet {
  id: string
  code: string
  value: string
}

interface UnassignedRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack: () => void
}

const UnassignedRulesView: React.FC<UnassignedRulesViewProps> = ({ accessToken, prefixDataTestId = '', onBack }) => {
  const [unassignedRules, setUnassignedRules] = useState<UnassignedAllowanceRegionRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  // Modal and assignment state
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false)
  const [selectedRule, setSelectedRule] = useState<UnassignedAllowanceRegionRule | null>(null)
  const [selectedTravelRegionSet, setSelectedTravelRegionSet] = useState<string | null>(null)
  const [travelRegionSets, setTravelRegionSets] = useState<TravelRegionSet[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  // Create rule modal state
  const [isCreateRuleModalVisible, setIsCreateRuleModalVisible] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const loadUnassignedRules = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
        query GetAllowanceRegionRules($limit: Int, $offset: Int) {
          AllowanceRegionRule(
            where: { isDeleted: { _eq: false } }
            orderBy: { code: ASC }
            limit: $limit
            offset: $offset
          ) {
            id
            code
            name
            activeFrom
            activeTo
            ruleOrder
            version
            travelRegionSetRef
            additionalProperties
            businessKey
            allowanceRegionRuleDetailAggregate(where: { isDeleted: { _eq: false } }) {
              aggregate {
                count
              }
            }
          }
          AllowanceRegionRuleAggregate(
            where: { isDeleted: { _eq: false } }
          ) {
            aggregate {
              count
            }
          }
        }
      `

        const result = await graphqlClient.request<{
          AllowanceRegionRule: any[]
          AllowanceRegionRuleAggregate: { aggregate: { count: number } }
        }>(query, {
          limit,
          offset
        })

        // Filter for unassigned rules (null, undefined, or empty travelRegionSetRef)
        const unassignedRulesData = result.AllowanceRegionRule.filter(
          (rule: any) => !rule.travelRegionSetRef || rule.travelRegionSetRef.trim() === ''
        )

        // Map the unassigned rules for this page
        const rules: UnassignedAllowanceRegionRule[] = unassignedRulesData.map((rule: any) => ({
          id: rule.id,
          code: rule.code,
          name: rule.name,
          activeFrom: rule.activeFrom,
          activeTo: rule.activeTo,
          ruleOrder: rule.ruleOrder,
          version: rule.version,
          additionalProperties: rule.additionalProperties,
          businessKey: rule.businessKey,
          detailCount: rule.allowanceRegionRuleDetailAggregate.aggregate.count
        }))

        // Set the total count to the actual number of unassigned rules found
        setTotalCount(unassignedRulesData.length)

        setUnassignedRules(rules)
      } catch (err) {
        console.error('Error loading unassigned rules:', err)
        setError(err instanceof Error ? err.message : 'Failed to load unassigned rules')
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient]
  )

  const loadTravelRegionSets = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TravelRegionSet', version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const sets: TravelRegionSet[] = response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value
      }))

      setTravelRegionSets(sets)
    } catch (err) {
      console.error('Error loading travel region sets:', err)
      toast.error('Failed to load travel region sets')
    }
  }, [catalogClient])

  // Load data on mount and when pagination changes
  useEffect(() => {
    if (accessToken) {
      const offset = (currentPage - 1) * pageSize
      loadUnassignedRules(pageSize, offset)
    }
  }, [accessToken, currentPage, pageSize, loadUnassignedRules])

  // Load travel region sets once on mount
  useEffect(() => {
    if (accessToken) {
      loadTravelRegionSets()
    }
  }, [accessToken, loadTravelRegionSets])

  const handleAssignToSet = (ruleId: string) => {
    const rule = unassignedRules.find(r => r.id === ruleId)
    if (rule) {
      setSelectedRule(rule)
      setIsAssignModalVisible(true)
      setSelectedTravelRegionSet(null)
    }
  }

  const handleAssignConfirm = async () => {
    if (!selectedRule || !selectedTravelRegionSet) {
      toast.error('Please select a travel region set')
      return
    }

    setIsAssigning(true)
    try {
      // Set access token on client
      expenseSettingsClient.setAccessToken(accessToken)

      // Prepare the data for saveAllowanceRegionRule
      const saveData = {
        allowanceRegionRule: {
          id: selectedRule.id,
          version: selectedRule.version,
          code: selectedRule.code,
          name: selectedRule.name,
          activeFrom: selectedRule.activeFrom,
          activeTo: selectedRule.activeTo || null,
          ruleOrder: selectedRule.ruleOrder || null,
          businessKey: selectedRule.businessKey || null,
          travelRegionSetRef: selectedTravelRegionSet, // Assign to the selected set
          additionalProperties: selectedRule.additionalProperties || {}
        },
        changeMode: 'UPDATE'
      }

      // Call the save endpoint
      await expenseSettingsClient.saveAllowanceRegionRule(saveData)

      toast.success(`Successfully assigned "${selectedRule.name}" to travel region set`)

      // Close modal and refresh data
      setIsAssignModalVisible(false)
      setSelectedRule(null)
      setSelectedTravelRegionSet(null)

      // Reset to page 1 and reload
      setCurrentPage(1)
      const offset = 0
      loadUnassignedRules(pageSize, offset)
    } catch (error) {
      console.error('Error assigning rule to set:', error)
      toast.error('Failed to assign rule to travel region set')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleAssignCancel = () => {
    setIsAssignModalVisible(false)
    setSelectedRule(null)
    setSelectedTravelRegionSet(null)
  }

  const handleCreateRuleSuccess = () => {
    // Close the modal
    setIsCreateRuleModalVisible(false)

    // Reset to page 1 and reload data
    setCurrentPage(1)
    const offset = 0
    loadUnassignedRules(pageSize, offset)
  }

  const renderRuleCell = (record: UnassignedAllowanceRegionRule) => (
    <div>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
        <span className="gba:font-medium">{record.name}</span>
        <Badge variant="secondary" className="gba:bg-orange-100 gba:text-orange-700">
          <PiWarning className="gba:mr-1 gba:w-3 gba:h-3" />
          Unassigned
        </Badge>
      </div>
      <div className="gba:text-sm gba:text-gray-500">{record.code}</div>
    </div>
  )

  const renderValidityCell = (record: UnassignedAllowanceRegionRule) => (
    <div className="gba:text-sm">
      {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
    </div>
  )

  const renderDetailsCountCell = (record: UnassignedAllowanceRegionRule) => (
    <Badge variant={record.detailCount > 0 ? 'default' : 'secondary'}>{record.detailCount} details</Badge>
  )

  const renderOrderCell = (record: UnassignedAllowanceRegionRule) => (
    <span className="gba:text-sm">{record.ruleOrder || '-'}</span>
  )

  const renderActionsCell = (record: UnassignedAllowanceRegionRule) => (
    <Button
      variant="default"
      size="sm"
      onClick={() => handleAssignToSet(record.id)}
      data-testid={`${prefixDataTestId}-assign-rule-${record.id}`}
    >
      Assign to Set
    </Button>
  )

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96">
        <div className="gba:text-gray-500">Loading unassigned rules...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="gba:max-w-md gba:mx-auto">
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div className="gba:font-medium gba:mb-1">Error Loading Unassigned Rules</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadUnassignedRules(pageSize, (currentPage - 1) * pageSize)}
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-unassigned-rules-view`} className="gba:p-6">
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-back-button`}>
            <PiArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back to Travel Region Sets
          </Button>
        </div>

        <Card className="gba:mb-6">
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-center">
              <div>
                <CardTitle className="gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('expense-settings:unassigned_rules', 'Unassigned Allowance Rules')}
                </CardTitle>
                <p className="gba:text-gray-600">
                  {totalCount === 0
                    ? 'All rules are assigned to Travel Region Sets'
                    : `${totalCount} rules not assigned to any Travel Region Set`}
                </p>
              </div>
              <Button
                variant="default"
                onClick={() => setIsCreateRuleModalVisible(true)}
                data-testid={`${prefixDataTestId}-create-rule-button`}
              >
                <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                Create New Rule
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {unassignedRules.length > 0 ? (
        <>
          <div className="gba:w-full gba:overflow-x-auto">
            <Table
              className="gba:min-w-[800px] gba:table-fixed"
              data-testid={`${prefixDataTestId}-unassigned-rules-table`}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                  <TableHead className="gba:w-[250px]">Rule</TableHead>
                  <TableHead className="gba:w-[200px]">Validity Period</TableHead>
                  <TableHead className="gba:w-[120px]">Details Count</TableHead>
                  <TableHead className="gba:w-[100px]">Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedRules.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="gba:w-[60px]">{renderActionsCell(record)}</TableCell>
                    <TableCell className="gba:w-[250px]">{renderRuleCell(record)}</TableCell>
                    <TableCell className="gba:w-[200px]">{renderValidityCell(record)}</TableCell>
                    <TableCell className="gba:w-[120px] gba:text-center">{renderDetailsCountCell(record)}</TableCell>
                    <TableCell className="gba:w-[100px] gba:text-center">{renderOrderCell(record)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <MileageRulesPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalCount}
            itemLabel="unassigned rules"
            onPageChange={pagination => {
              setCurrentPage(pagination.current)
              setPageSize(pagination.pageSize)
            }}
          />
        </>
      ) : (
        <div className="gba:text-center gba:py-12">
          <PiWarning className="gba:text-4xl gba:text-green-400 gba:mb-4" />
          <h4 className="gba:text-lg gba:font-medium gba:text-gray-600 gba:mb-2">All Rules Are Assigned</h4>
          <p className="gba:text-gray-500">Great! All allowance region rules are assigned to travel region sets.</p>
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={isAssignModalVisible} onOpenChange={setIsAssignModalVisible}>
        <DialogContent data-testid={`${prefixDataTestId}-assign-modal`}>
          <DialogHeader>
            <DialogTitle>Assign Rule to Travel Region Set</DialogTitle>
          </DialogHeader>

          {selectedRule && (
            <div className="gba:space-y-4">
              <div>
                <div className="gba:font-medium gba:mb-2">Rule to assign:</div>
                <div className="gba:p-3 gba:bg-gray-50 gba:rounded">
                  <div className="gba:font-medium">{selectedRule.name}</div>
                  <div className="gba:text-sm gba:text-gray-500">{selectedRule.code}</div>
                </div>
              </div>

              <div>
                <div className="gba:font-medium gba:mb-2">Select Travel Region Set:</div>
                <Select
                  value={selectedTravelRegionSet || ''}
                  onValueChange={setSelectedTravelRegionSet}
                  data-testid={`${prefixDataTestId}-travel-region-set-select`}
                >
                  <SelectTrigger className="gba:w-full">
                    <SelectValue placeholder="Choose a travel region set" />
                  </SelectTrigger>
                  <SelectContent>
                    {travelRegionSets.map(set => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.value} ({set.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTravelRegionSet && (
                <div className="gba:p-3 gba:bg-blue-50 gba:rounded">
                  <p className="gba:text-sm gba:text-gray-600">
                    The rule "{selectedRule.name}" will be assigned to the selected travel region set and will no longer
                    appear in the unassigned list.
                  </p>
                </div>
              )}

              <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4">
                <Button variant="outline" onClick={handleAssignCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAssignConfirm} disabled={isAssigning || !selectedTravelRegionSet}>
                  {isAssigning ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Rule Modal */}
      <AllowanceRegionRuleForm
        accessToken={accessToken}
        open={isCreateRuleModalVisible}
        onClose={() => setIsCreateRuleModalVisible(false)}
        onSave={handleCreateRuleSuccess}
        travelRegionSetId={undefined} // Create as unassigned rule
        travelRegionSetName="Unassigned"
        prefixDataTestId={prefixDataTestId}
      />

      <Toaster />
    </div>
  )
}

export default UnassignedRulesView
