import React, { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { PiWarning, PiTrash, PiCheckCircle } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import { toast } from 'sonner'

interface IntegrityIssue {
  detailId: string
  ruleId: string
  ruleCode: string
  ruleName: string
  travelRegionSetRef: string
  regionId: string
  regionCode: string
  regionValue: string
  regionParentId: string | null
  amount: number
  activeFrom: string
  activeTo: string | null
  version: number
}

interface DataIntegrityCheckerProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const INTEGRITY_CHECK_QUERY = `
  query AnalyzeAllowanceDetailIntegrity {
    AllowanceRegionRule(
      where: { 
        isDeleted: { _eq: false }
        travelRegionSetRef: { _neq: "" }
      }
    ) {
      id
      code
      name
      travelRegionSetRef
      allowanceRegionRuleDetail(where: { isDeleted: { _eq: false } }) {
        id
        amount
        activeFrom
        activeTo
        version
        travelRegionRef
        currencyRef
        countryRef
        travelRegion {
          id
          code
          value
          parentEntryId
        }
        currency {
          id
        }
        country {
          id
        }
      }
    }
  }
`

const DataIntegrityChecker: React.FC<DataIntegrityCheckerProps> = ({ accessToken, prefixDataTestId = '' }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [issues, setIssues] = useState<IntegrityIssue[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const graphqlClient = useGraphQLClient(accessToken)
  const expenseSettingsClient = new ExpenseSettingsClient()
  expenseSettingsClient.setAccessToken(accessToken)

  const analyzeData = async () => {
    setIsAnalyzing(true)
    setIssues([])
    setHasAnalyzed(false)

    try {
      const result = await graphqlClient.request<{ AllowanceRegionRule: any[] }>(INTEGRITY_CHECK_QUERY)
      const rules = result.AllowanceRegionRule

      const foundIssues: IntegrityIssue[] = []

      rules.forEach(rule => {
        rule.allowanceRegionRuleDetail.forEach((detail: any) => {
          const regionParentId = detail.travelRegion?.parentEntryId
          const expectedSetId = rule.travelRegionSetRef

          // Check if region belongs to wrong travel set
          if (regionParentId !== expectedSetId) {
            foundIssues.push({
              detailId: detail.id,
              ruleId: rule.id,
              ruleCode: rule.code,
              ruleName: rule.name,
              travelRegionSetRef: expectedSetId,
              regionId: detail.travelRegion?.id || '',
              regionCode: detail.travelRegion?.code || '',
              regionValue: detail.travelRegion?.value || '',
              regionParentId: regionParentId,
              amount: detail.amount,
              activeFrom: detail.activeFrom,
              activeTo: detail.activeTo,
              version: detail.version
            })
          }
        })
      })

      setIssues(foundIssues)
      setHasAnalyzed(true)

      if (foundIssues.length === 0) {
        toast.success('No data integrity issues found!')
      } else {
        toast.warning(`Found ${foundIssues.length} details with incorrect travel region assignments`)
      }
    } catch (error) {
      console.error('[DataIntegrityChecker] Error analyzing data:', error)
      toast.error('Failed to analyze data integrity')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const deleteDetail = async (issue: IntegrityIssue) => {
    if (
      !confirm(
        `Are you sure you want to delete this detail?\n\nRule: ${issue.ruleName}\nRegion: ${issue.regionValue}\nAmount: ${issue.amount}`
      )
    ) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(issue.detailId))

    try {
      // Need to get full detail data from GraphQL to have all required fields
      const detailQuery = `
        query GetDetailForDelete($detailId: uuid!) {
          AllowanceRegionRuleDetail(where: { id: { _eq: $detailId } }) {
            id
            version
            allowanceRegionRuleId
            travelRegionRef
            currencyRef
            countryRef
            amount
            activeFrom
            activeTo
          }
        }
      `

      const detailResult = await graphqlClient.request<{ AllowanceRegionRuleDetail: any[] }>(detailQuery, {
        detailId: issue.detailId
      })

      if (!detailResult.AllowanceRegionRuleDetail || detailResult.AllowanceRegionRuleDetail.length === 0) {
        throw new Error('Detail not found')
      }

      const fullDetail = detailResult.AllowanceRegionRuleDetail[0]

      await expenseSettingsClient.deleteAllowanceRegionRuleDetail({
        id: fullDetail.id,
        version: fullDetail.version,
        allowanceRegionRuleId: fullDetail.allowanceRegionRuleId,
        travelRegionRef: fullDetail.travelRegionRef,
        currencyRef: fullDetail.currencyRef,
        countryRef: fullDetail.countryRef,
        amount: fullDetail.amount,
        activeFrom: fullDetail.activeFrom,
        activeTo: fullDetail.activeTo
      })

      toast.success(`Deleted detail for ${issue.regionValue}`)

      // Remove from issues list
      setIssues(prev => prev.filter(i => i.detailId !== issue.detailId))
    } catch (error: any) {
      console.error('[DataIntegrityChecker] Error deleting detail:', error)
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`)
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(issue.detailId)
        return next
      })
    }
  }

  const groupedIssues = issues.reduce(
    (acc, issue) => {
      const key = `${issue.ruleCode}`
      if (!acc[key]) {
        acc[key] = {
          ruleCode: issue.ruleCode,
          ruleName: issue.ruleName,
          travelRegionSetRef: issue.travelRegionSetRef,
          issues: []
        }
      }
      acc[key].issues.push(issue)
      return acc
    },
    {} as Record<string, { ruleCode: string; ruleName: string; travelRegionSetRef: string; issues: IntegrityIssue[] }>
  )

  return (
    <Card className="gba:max-w-6xl gba:mx-auto" data-testid={`${prefixDataTestId}-data-integrity-checker`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiWarning className="gba:w-5 gba:h-5 gba:text-warning" />
              Data Integrity Checker
            </CardTitle>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              Identifies allowance details assigned to regions from wrong travel sets
            </p>
          </div>
          <Button
            onClick={analyzeData}
            disabled={isAnalyzing}
            variant="default"
            data-testid={`${prefixDataTestId}-analyze-button`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!hasAnalyzed && (
          <Alert>
            <AlertDescription>
              Click "Run Analysis" to scan all allowance region rule details and identify any that reference regions
              from incorrect travel sets.
            </AlertDescription>
          </Alert>
        )}

        {hasAnalyzed && issues.length === 0 && (
          <Alert variant="default" className="gba:bg-success-secondary gba:text-success gba:border-success">
            <AlertDescription className="gba:flex gba:items-center gba:gap-2">
              <PiCheckCircle className="gba:w-5 gba:h-5" />
              <span>All allowance details are correctly assigned! No issues found.</span>
            </AlertDescription>
          </Alert>
        )}

        {hasAnalyzed && issues.length > 0 && (
          <div className="gba:space-y-6">
            <Alert variant="destructive">
              <AlertDescription>
                <div className="gba:font-medium gba:mb-1">⚠️ Found {issues.length} incorrect detail(s)</div>
                <p className="gba:text-sm">
                  These details reference travel regions that don't belong to their rule's travel set. Review and delete
                  them to fix data integrity.
                </p>
              </AlertDescription>
            </Alert>

            {Object.values(groupedIssues).map((group, groupIndex) => (
              <Card key={groupIndex} className="gba:border-destructive">
                <CardHeader className="gba:pb-3">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div>
                      <CardTitle className="gba:text-base">{group.ruleName}</CardTitle>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        Code: {group.ruleCode} | Expected Set: {group.travelRegionSetRef}
                      </p>
                    </div>
                    <Badge variant="destructive">{group.issues.length} issue(s)</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-3">
                    {group.issues.map((issue, issueIndex) => (
                      <div
                        key={issue.detailId}
                        className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted gba:rounded-lg"
                        data-testid={`${prefixDataTestId}-issue-${issueIndex}`}
                      >
                        <div className="gba:flex-1">
                          <div className="gba:font-medium">
                            {issue.regionValue} ({issue.regionCode})
                          </div>
                          <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                            Amount: {issue.amount} | Period: {issue.activeFrom} → {issue.activeTo || '∞'}
                          </div>
                          <div className="gba:text-xs gba:text-destructive gba:mt-1">
                            Region belongs to: {issue.regionParentId || 'NULL'} (Expected: {issue.travelRegionSetRef})
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDetail(issue)}
                          disabled={deletingIds.has(issue.detailId)}
                          data-testid={`${prefixDataTestId}-delete-${issueIndex}`}
                        >
                          <PiTrash className="gba:w-4 gba:h-4 gba:mr-1" />
                          {deletingIds.has(issue.detailId) ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DataIntegrityChecker
