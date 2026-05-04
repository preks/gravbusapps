import React, { useState, useEffect } from 'react'
import {
  Button,
  Textarea,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Separator,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { InvestmentReportApproveData } from './types'
import dayjs from 'dayjs'

interface InvestmentReportApproveFormProps extends BusinessAppContextProps {
  onClose?: () => void
}

const InvestmentReportApproveFormContent: React.FC<InvestmentReportApproveFormProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose = () => {}
}) => {
  const [approveData, setApproveData] = useState<InvestmentReportApproveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Extract data from psi_taskPayload (directly without parameters wrapper)
    if (additionalData?.psi_taskPayload?.investmentReportProcessContext) {
      setApproveData({
        investmentReportProcessContext: additionalData.psi_taskPayload.investmentReportProcessContext
      })
    }
    setIsLoading(false)
  }, [additionalData])

  const formatCurrency = (amount: number | null, currencyRef: string | null) => {
    if (amount === null) return 'N/A'

    const currencyCode = currencyRef?.split(':').pop() || 'EUR'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('DD.MM.YYYY')
  }

  const formatPercentage = (value: number | null) => {
    if (value === null) return 'N/A'
    return `${value}%`
  }

  const handleApprove = async () => {
    if (!approveData) return

    setIsSubmitting(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        updatedInvestment: approveData.investmentReportProcessContext.updatedInvestment,
        comment: message || '',
        userId: userInfo?.employeeDetails?.employeeId
      })

      onClose()
    } catch (err) {
      console.error('Error approving investment report:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!approveData) return

    setIsSubmitting(true)
    try {
      dispatchProcessContinueEvent('pse_reject', {
        comment: message || '',
        userId: userInfo?.employeeDetails?.employeeId
      })

      onClose()
    } catch (err) {
      console.error('Error rejecting investment report:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!accessToken) {
    return (
      <div data-testid="investment-report-approve-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>Missing access token. Please check the platform configuration.</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div data-testid="investment-report-approve-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!approveData) {
    return (
      <div data-testid="investment-report-approve-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>
                No investment report data available for approval. Please check the process configuration.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  const { currentInvestment, updatedInvestment, extractedReports } = approveData.investmentReportProcessContext
  const currentInv = currentInvestment.investment
  const updatedInv = updatedInvestment.investment
  const currentRealEstate = currentInvestment.realEstateInvestment
  const updatedRealEstate = updatedInvestment.realEstateInvestment

  const renderComparisonField = (
    label: string,
    currentValue: any,
    updatedValue: any,
    formatter?: (val: any) => string
  ) => {
    const formatValue = formatter || ((val: any) => val?.toString() || 'N/A')
    const hasChange = currentValue !== updatedValue

    return (
      <div className="gba:flex gba:justify-between gba:items-start gba:py-2">
        <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">{label}:</span>
        <div className="gba:ml-4 gba:text-right gba:flex-1">
          {hasChange ? (
            <div className="gba:space-y-1">
              <div className="gba:text-destructive gba:line-through">{formatValue(currentValue)}</div>
              <div className="gba:text-success gba:font-semibold">{formatValue(updatedValue)}</div>
            </div>
          ) : (
            <div className="gba:text-foreground">{formatValue(currentValue)}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:border-0" data-testid="investment-report-approve-container">
      <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
        <div className="gba:p-0">
          {/* Header Section */}
          <div className="gba:text-center gba:mb-6 gba:px-6 gba:pt-8" data-testid="investment-report-approve-header">
            <h1
              className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground gba:mb-2"
              data-testid="investment-report-approve-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:investment_report.approve.title',
                'Approve Investment Report'
              )}
            </h1>
            <p className="gba:text-muted-foreground">
              Review the AI-extracted investment data and approve or reject the changes
            </p>
          </div>

          <Separator className="gba:h-px gba:bg-secondary gba:mb-8" />

          {/* Investment Name Display */}
          <div className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:mb-8">
            <h2 className="gba:text-xl gba:font-bold gba:text-foreground gba:m-0">{currentInv.name}</h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Investment ID: {currentInv.id}</p>
          </div>

          {/* Investment Data Comparison */}
          <div className="gba:px-6 gba:mb-8">
            <Card>
              <CardHeader>
                <CardTitle>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:investment_report.approve.investment_details',
                    'Investment Details'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-2">
                {renderComparisonField(
                  'Market Value',
                  currentInv.investmentMarketValue,
                  updatedInv.investmentMarketValue,
                  val => formatCurrency(val, currentInv.currencyRef)
                )}
                {renderComparisonField(
                  'Total Investment Amount',
                  currentInv.totalInvestmentAmount,
                  updatedInv.totalInvestmentAmount,
                  val => formatCurrency(val, currentInv.currencyRef)
                )}
                {renderComparisonField(
                  'Stake Percentage',
                  currentInv.stakePercentage,
                  updatedInv.stakePercentage,
                  formatPercentage
                )}
                {renderComparisonField('Quantity', currentInv.securityQuantity, updatedInv.securityQuantity)}
                {renderComparisonField(
                  'Time-Weighted Performance',
                  currentInv.timeWeightedPerformance,
                  updatedInv.timeWeightedPerformance,
                  formatPercentage
                )}
                {renderComparisonField(
                  'Forecasted Revenue',
                  currentInv.forecastedRevenueAmount,
                  updatedInv.forecastedRevenueAmount,
                  val => formatCurrency(val, currentInv.currencyRef)
                )}
                {renderComparisonField(
                  'Forecasted Profit',
                  currentInv.forecastedProfitAmount,
                  updatedInv.forecastedProfitAmount,
                  val => formatCurrency(val, currentInv.currencyRef)
                )}
              </CardContent>
            </Card>
          </div>

          {/* Real Estate Details (if applicable) */}
          {currentRealEstate && updatedRealEstate && (
            <div className="gba:px-6 gba:mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:investment_report.approve.real_estate_details',
                      'Real Estate Details'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="gba:space-y-2">
                  {renderComparisonField(
                    'Annual Net Cold Rent',
                    currentRealEstate.annualNetColdRent,
                    updatedRealEstate.annualNetColdRent,
                    val => formatCurrency(val, currentInv.currencyRef)
                  )}
                  {renderComparisonField(
                    'Occupancy',
                    currentRealEstate.occupancyPercent,
                    updatedRealEstate.occupancyPercent,
                    formatPercentage
                  )}
                  {renderComparisonField(
                    'Number of Units',
                    currentRealEstate.numberOfUnits,
                    updatedRealEstate.numberOfUnits
                  )}
                  {renderComparisonField('Size', currentRealEstate.size, updatedRealEstate.size, val =>
                    val ? `${val} m²` : 'N/A'
                  )}
                  {renderComparisonField('Funding', currentRealEstate.funding, updatedRealEstate.funding, val =>
                    formatCurrency(val, currentInv.currencyRef)
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Extracted Reports */}
          {extractedReports && extractedReports.length > 0 && (
            <div className="gba:px-6 gba:mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:investment_report.approve.extracted_reports',
                      'Extracted Reports'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {extractedReports.map((report, index) => (
                    <div key={index} className="gba:mb-4 gba:last:mb-0">
                      <div className="gba:font-semibold gba:text-foreground gba:mb-2">
                        Report {index + 1} - {report.investmentReport.scope} ({formatDate(report.investmentReport.date)}
                        )
                      </div>
                      <div className="gba:space-y-1 gba:text-sm">
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-muted-foreground">Market Value:</span>
                          <span className="gba:text-foreground gba:font-medium">
                            {formatCurrency(
                              report.investmentReport.investmentMarketValue,
                              report.investmentReport.currencyRef
                            )}
                          </span>
                        </div>
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-muted-foreground">Total Investment:</span>
                          <span className="gba:text-foreground gba:font-medium">
                            {formatCurrency(
                              report.investmentReport.totalInvestmentAmount,
                              report.investmentReport.currencyRef
                            )}
                          </span>
                        </div>
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-muted-foreground">Initial Investment:</span>
                          <span className="gba:text-foreground gba:font-medium">
                            {formatCurrency(
                              report.investmentReport.initialInvestmentAmount,
                              report.investmentReport.currencyRef
                            )}
                          </span>
                        </div>
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-muted-foreground">Quantity:</span>
                          <span className="gba:text-foreground gba:font-medium">
                            {report.investmentReport.securityQuantity ?? 'N/A'}
                          </span>
                        </div>
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-muted-foreground">Time-Weighted Performance:</span>
                          <span className="gba:text-foreground gba:font-medium">
                            {formatPercentage(report.investmentReport.timeWeightedPerformance)}
                          </span>
                        </div>
                        {report.realEstateInvestmentReport && (
                          <>
                            <div className="gba:flex gba:justify-between">
                              <span className="gba:text-muted-foreground">Annual Net Cold Rent:</span>
                              <span className="gba:text-foreground gba:font-medium">
                                {formatCurrency(
                                  report.realEstateInvestmentReport.annualNetColdRent,
                                  report.investmentReport.currencyRef
                                )}
                              </span>
                            </div>
                            <div className="gba:flex gba:justify-between">
                              <span className="gba:text-muted-foreground">Occupancy:</span>
                              <span className="gba:text-foreground gba:font-medium">
                                {formatPercentage(report.realEstateInvestmentReport.occupancyPercent)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {index < extractedReports.length - 1 && <Separator className="gba:my-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Message Section */}
          <div className="gba:px-6 gba:mb-8">
            <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:investment_report.approve.comment', 'Comment')}
            </h3>
            <Textarea
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:investment_report.approve.comment_placeholder',
                'Add your comment or feedback...'
              )}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="gba:min-h-24 gba:resize-y gba:w-full"
              data-testid="investment-report-approve-message-input"
            />
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:justify-end gba:gap-4 gba:px-6 gba:pb-8">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSubmitting}
              data-testid="investment-report-approve-reject-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:investment_report.approve.reject_button', 'Reject')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              data-testid="investment-report-approve-approve-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:investment_report.approve.approve_button', 'Approve')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const InvestmentReportApproveForm: React.FC<BusinessAppContextProps> = props => {
  return (
    <AppActionForm
      processType="custom"
      submitEventType="pse_submit"
      cancelEventType="pse_reject"
      onSubmit={async () => {
        return {}
      }}
      formData={{}}
      businessAppContext={props}
      disableFormSubmission={true}
      data-testid="investment-report-approve-form"
    >
      <InvestmentReportApproveFormContent {...props} />
    </AppActionForm>
  )
}

export default InvestmentReportApproveForm
