import React, { useCallback, useMemo, useState } from 'react'
import {
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import RoundingRuleForm from '@/business-apps/mdm/forms/time-attendance/RoundingRuleForm'
import { TransformedRoundingRuleVersion } from '../../types/rounding-rule-versions'
import { SimpleRoundingRule } from '../../types/rounding-rules'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface RoundingRulesItemsProps {
  roundingRules: SimpleRoundingRule[]
  roundingRuleVersions: TransformedRoundingRuleVersion[]
  refetch: () => void
  accessToken: string
  prefixDataTestId?: string
  onConfigure: (roundingRuleVersion: TransformedRoundingRuleVersion) => void
}

const DATA_TEST_ID_PREFIX = 'RoundingRulesItems'

export const RoundingRulesItems: React.FC<RoundingRulesItemsProps> = ({
  roundingRules,
  roundingRuleVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onConfigure
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoundingRule, setSelectedRoundingRule] = useState<SimpleRoundingRule | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredRoundingRules = useMemo(() => {
    if (!searchTerm.trim()) return roundingRules

    return roundingRules.filter(
      roundingRule =>
        roundingRule.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roundingRule.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [roundingRules, searchTerm])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Find the latest active roundingRuleVersion for a given roundingRule
  const getLatestRoundingRuleVersion = useCallback(
    (roundingRule: SimpleRoundingRule): TransformedRoundingRuleVersion | null => {
      if (!roundingRule.roundingRuleVersion || roundingRule.roundingRuleVersion.length === 0) {
        return null
      }

      // Get the last ID from the roundingRuleVersion array (most recent)
      const latestVersionId = roundingRule.roundingRuleVersion[roundingRule.roundingRuleVersion.length - 1]

      // Find the corresponding roundingRuleVersion in the versions list
      return roundingRuleVersions.find(version => version.id === latestVersionId) || null
    },
    [roundingRuleVersions]
  )

  // Handle row click to configure the latest roundingRuleVersion
  const handleRowClick = useCallback(
    (roundingRule: SimpleRoundingRule) => {
      const latestVersion = getLatestRoundingRuleVersion(roundingRule)

      if (latestVersion) {
        onConfigure(latestVersion)
      } else {
        const partialVersion: TransformedRoundingRuleVersion = {
          id: '',
          activeVersion: '',
          activeFrom: null,
          activeTo: null,
          version: 0,
          roundingRule: {
            id: roundingRule.id,
            name: roundingRule.name,
            code: roundingRule.code
          }
        }
        onConfigure(partialVersion)
      }
    },
    [getLatestRoundingRuleVersion, onConfigure]
  )

  // Handle delete rounding rule
  const handleDeleteRoundingRule = useCallback(
    async (roundingRule?: SimpleRoundingRule | null) => {
      if (!roundingRule) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteRoundingRule',
          {
            changeMode: 'POST',
            roundingRule: {
              id: roundingRule.id,
              version: roundingRule.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
        setIsDeleteDialogOpen(false)
        setSelectedRoundingRule(null)
      } catch (error) {
        console.error('Error deleting rounding rule:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedRoundingRule(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  const columns: ColumnDef<SimpleRoundingRule>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      enableSorting: true
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableHiding: true,
      cell: ({ row }) => {
        const targetRoundingRule = roundingRules.find(roundingRule => roundingRule.id === row.original.id)

        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
            <RoundingRuleForm
              childAddButton={
                <Button variant="ghost" onClick={event => event.stopPropagation()}>
                  <PencilSimpleLineIcon />
                </Button>
              }
              refetch={refetch}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              roundingRule={targetRoundingRule || undefined}
              usedCodes={roundingRules.map(rr => rr.code).filter((code, index, self) => self.indexOf(code) === index)}
              key={targetRoundingRule?.id}
            />
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setSelectedRoundingRule(targetRoundingRule ?? null)
                setIsDeleteDialogOpen(true)
              }}
              data-testid={formatDataTestId(prefixDataTestId, `delete-button-${targetRoundingRule?.id}`)}
            >
              <TrashIcon />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'rounding-rules-items')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search rounding rules..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredRoundingRules.length} of {roundingRules.length} rounding rules
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredRoundingRules}
        data-testid={formatDataTestId(prefixDataTestId, 'rounding-rules-items-table')}
        onRowClick={handleRowClick}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <WarningIcon className="gba:text-destructive" />
              Delete Rounding Rule
            </DialogTitle>
            <DialogDescription>{`Are you sure you want to delete ${selectedRoundingRule?.name ?? ''}?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => handleDeleteRoundingRule(selectedRoundingRule)}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RoundingRulesItems
