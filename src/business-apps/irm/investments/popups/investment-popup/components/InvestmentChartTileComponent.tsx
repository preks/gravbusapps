import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  Alert,
  AlertDescription,
  Spinner,
  RadioGroup,
  RadioGroupItem,
  Label
} from '@newwork/nw-design-system'
import { Plus, Trash2, PieChart, BarChart3, LineChart } from 'lucide-react'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'
import {
  extractInvestmentId,
  parseAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS,
  getInvestmentGroupType
} from '../utils/investmentPopupUtils'
import {
  TileData,
  TILE_TYPES,
  ChartType,
  PieChartData,
  BarChartData,
  LineChartData
} from '@/business-apps/irm/common/types/tileTypes'
import {
  generateTileId,
  generateChartDataId,
  loadTilesFromInvestment,
  findTileById,
  upsertTile
} from '@/business-apps/irm/common/utils/tileUtils'

const prefixDataTestId = 'investment-chart-tile-component'

// Pie chart validation schema
const pieChartItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  percentage: z
    .string()
    .min(1, 'Percentage is required')
    .refine(val => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) >= 0, {
      message: 'Must be a positive number'
    })
})

const pieChartSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    chartType: z.literal('pie'),
    pieData: z.array(pieChartItemSchema).min(1, 'At least one item is required')
  })
  .refine(
    data => {
      const total = data.pieData.reduce((sum, item) => sum + Number.parseFloat(item.percentage || '0'), 0)
      return total <= 100
    },
    {
      message: 'Total percentage cannot exceed 100%',
      path: ['pieData']
    }
  )

// Bar chart validation schema
const barChartAxisItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(val => !Number.isNaN(Number.parseFloat(val)), { message: 'Must be a valid number' })
})

const barChartSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  chartType: z.literal('bar'),
  barData: z.object({
    xAxis: z.array(barChartAxisItemSchema).min(1, 'At least one X-axis point is required'),
    yAxis: z.array(barChartAxisItemSchema).min(1, 'At least one Y-axis point is required')
  })
})

// Line chart validation schema (same as bar chart)
const lineChartSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  chartType: z.literal('line'),
  lineData: z.object({
    xAxis: z.array(barChartAxisItemSchema).min(1, 'At least one X-axis point is required'),
    yAxis: z.array(barChartAxisItemSchema).min(1, 'At least one Y-axis point is required')
  })
})

type PieChartFormData = z.infer<typeof pieChartSchema>
type BarChartFormData = z.infer<typeof barChartSchema>
type LineChartFormData = z.infer<typeof lineChartSchema>
type ChartTileFormData = PieChartFormData | BarChartFormData | LineChartFormData

export interface InvestmentChartTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileData: TileData) => void
  tileId?: string
}

export const InvestmentChartTileComponent: React.FC<InvestmentChartTileComponentProps> = ({
  onClose,
  accessToken,
  userInfo,
  additionalData,
  tileId
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }
  const investmentId = extractInvestmentId(additionalData)

  const {
    investment,
    loading: isLoadingInvestment,
    error
  } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'chart'
  })

  const isEditMode = !!tileId
  const existingTile = isEditMode && investment ? findTileById(investment, tileId) : undefined
  const existingChartType = existingTile?.chartData?.chartType || 'pie'

  const [chartType, setChartType] = useState<ChartType>(existingChartType)

  // Determine schema based on chart type
  const getSchema = () => {
    switch (chartType) {
      case 'pie':
        return pieChartSchema
      case 'bar':
        return barChartSchema
      case 'line':
        return lineChartSchema
      default:
        return pieChartSchema
    }
  }

  const form = useForm<ChartTileFormData>({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      title: '',
      chartType: 'pie',
      pieData: [{ id: generateChartDataId(), name: '', percentage: '' }],
      barData: {
        xAxis: [{ id: generateChartDataId(), name: '', amount: '' }],
        yAxis: [{ id: generateChartDataId(), name: '', amount: '' }]
      },
      lineData: {
        xAxis: [{ id: generateChartDataId(), name: '', amount: '' }],
        yAxis: [{ id: generateChartDataId(), name: '', amount: '' }]
      }
    }
  })

  // Load existing tile data
  useEffect(() => {
    if (existingTile && investment) {
      form.reset({
        title: existingTile.title,
        chartType: existingTile.chartData?.chartType || 'pie',
        pieData: existingTile.chartData?.pieData?.map(item => ({
          id: item.id,
          name: item.name,
          percentage: item.percentage.toString()
        })) || [{ id: generateChartDataId(), name: '', percentage: '' }],
        barData: existingTile.chartData?.barData
          ? {
              xAxis: existingTile.chartData.barData.xAxis.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount.toString()
              })),
              yAxis: existingTile.chartData.barData.yAxis.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount.toString()
              }))
            }
          : {
              xAxis: [{ id: generateChartDataId(), name: '', amount: '' }],
              yAxis: [{ id: generateChartDataId(), name: '', amount: '' }]
            },
        lineData: existingTile.chartData?.lineData
          ? {
              xAxis: existingTile.chartData.lineData.xAxis.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount.toString()
              })),
              yAxis: existingTile.chartData.lineData.yAxis.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount.toString()
              }))
            }
          : {
              xAxis: [{ id: generateChartDataId(), name: '', amount: '' }],
              yAxis: [{ id: generateChartDataId(), name: '', amount: '' }]
            }
      } as any)
      setChartType(existingTile.chartData?.chartType || 'pie')
    }
  }, [existingTile, investment])

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editChartTile', 'Edit Chart Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.addChartTile', 'Add Chart Tile')

  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error-alert`}>
        <AlertDescription>{INVESTMENT_ERRORS.MISSING_ID()}</AlertDescription>
      </Alert>
    )
  }

  if (isLoadingInvestment) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8" data-testid={`${prefixDataTestId}-loading`}>
        <Spinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-load-error-alert`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const handleSubmit = async (formData: ChartTileFormData) => {
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    const currentTiles = loadTilesFromInvestment(investment)

    // Build chart data based on type
    const chartData: any = { chartType: formData.chartType }

    if (formData.chartType === 'pie' && 'pieData' in formData) {
      const pieData: PieChartData[] = formData.pieData.map(item => ({
        id: item.id,
        name: item.name,
        percentage: Number.parseFloat(item.percentage)
      }))
      chartData.pieData = pieData
    } else if (formData.chartType === 'bar' && 'barData' in formData) {
      const barData: BarChartData = {
        xAxis: formData.barData.xAxis.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number.parseFloat(item.amount)
        })),
        yAxis: formData.barData.yAxis.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number.parseFloat(item.amount)
        }))
      }
      chartData.barData = barData
    } else if (formData.chartType === 'line' && 'lineData' in formData) {
      const lineData: LineChartData = {
        xAxis: formData.lineData.xAxis.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number.parseFloat(item.amount)
        })),
        yAxis: formData.lineData.yAxis.map(item => ({
          id: item.id,
          name: item.name,
          amount: Number.parseFloat(item.amount)
        }))
      }
      chartData.lineData = lineData
    }

    const tileData: TileData = {
      id: tileId || generateTileId(),
      type: TILE_TYPES.CHART,
      title: formData.title,
      chartData,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        tileData.createdAt = existingTile.createdAt
        tileData.order = existingTile.order
      }
    }

    const updatedTiles = upsertTile(currentTiles, tileData)
    const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      tilesData: updatedTiles
    }

    const groupType = getInvestmentGroupType(investment)

    // Create investment form data using the full structure with all investment fields
    const investmentFormData: any = {
      investment: {
        id: investmentId,
        version: investment.version,
        name: investment.name || '',
        initialInvestmentAmount: investment.initialInvestmentAmount || 0,
        investmentGroup: investment.investmentGroup,
        ownerEmployee: investment.ownerEmployee,

        // Include ALL existing investment fields to preserve them
        code: investment.code,
        isin: investment.isin,
        investmentType: investment.investmentType,
        investmentStakeType: investment.investmentStakeType,
        investmentPhase: investment.investmentPhase,
        investmentStatus: investment.investmentStatus,
        investmentRiskLevel: investment.investmentRiskLevel,
        acquisitionDate: investment.acquisitionDate,
        planedExit: investment.planedExit,
        plannedExitDate: investment.plannedExitDate,
        exitDate: investment.exitDate,
        totalInvestmentAmount: investment.totalInvestmentAmount,
        investmentMarketValue: investment.investmentMarketValue,
        debtFinancingAmount: investment.debtFinancingAmount,
        requiredCapitalAmount: investment.requiredCapitalAmount,
        forecastedRevenueAmount: investment.forecastedRevenueAmount,
        forecastedProfitAmount: investment.forecastedProfitAmount,
        stakePercentage: investment.stakePercentage,
        loanRecipientName: investment.loanRecipientName,
        loanAmount: investment.loanAmount,
        loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount,
        loanInterestRate: investment.loanInterestRate,
        loanStartDate: investment.loanStartDate,
        loanEndDate: investment.loanEndDate,
        loanInterestClaim: investment.loanInterestClaim,
        totalCommitmentAmount: investment.totalCommitmentAmount,
        totalDistributionAmount: investment.totalDistributionAmount,
        currency: investment.currency,
        fundManagerName: investment.fundManagerName,
        identification: investment.identification,
        investmentAccount: investment.investmentAccount,
        investmentOpportunity: investment.investmentOpportunity?.id,
        loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id,
        additionalProperties: updatedAdditionalProps
      }
    }

    // Add the appropriate subtype based on investment group
    if (groupType === 'EQUITY') {
      const existingEquity = Array.isArray(investment.equityInvestment)
        ? investment.equityInvestment[0]
        : investment.equityInvestment
      investmentFormData.equityInvestment = existingEquity || {}
    } else if (groupType === 'REAL_ESTATE') {
      const existingRealEstate = Array.isArray(investment.realEstateInvestment)
        ? investment.realEstateInvestment[0]
        : investment.realEstateInvestment
      investmentFormData.realEstateInvestment = existingRealEstate || {}
    } else if (groupType === 'LIQUID_FUND') {
      const existingLiquidFund = Array.isArray(investment.liquidFundInvestment)
        ? investment.liquidFundInvestment[0]
        : investment.liquidFundInvestment
      investmentFormData.liquidFundInvestment = existingLiquidFund || {}
    } else if (groupType === 'PRIVATE_EQUITY') {
      const existingPrivateEquity = Array.isArray(investment.privateEquityInvestment)
        ? investment.privateEquityInvestment[0]
        : investment.privateEquityInvestment
      investmentFormData.privateEquityInvestment = existingPrivateEquity || {}
    }

    const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add changeMode
    ;(payload as any).changeMode = 'UPDATE'

    // Add businessKey
    ;(payload as any).businessKey = `investment-chart-tile-${tileData.id}`

    return payload
  }

  const handleSuccess = () => {
    onClose()
  }

  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType)
    form.setValue('chartType', newType as any)
  }

  return (
    <AppActionForm
      form={form}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      submitButtonText={
        isEditMode
          ? getTranslationFromI18nKeyAndLabel('investment.tiles.saveChanges', 'Save Changes')
          : getTranslationFromI18nKeyAndLabel('investment.tiles.createTile', 'Create Tile')
      }
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      onCancel={onClose}
      data-testid={prefixDataTestId}
      accessToken={accessToken}
      userInfo={userInfo}
    >
      <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-form-content`}>
        <h3 className="gba:text-lg gba:font-semibold">{formTitle}</h3>

        {/* Title Input */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.chartTitleLabel', 'Chart Title')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.chartTitlePlaceholder',
                    'Enter chart title'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'title-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Chart Type Selection */}
        <FormField
          control={form.control}
          name="chartType"
          render={() => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.chartTypeLabel', 'Chart Type')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <RadioGroup
                  value={chartType}
                  onValueChange={value => handleChartTypeChange(value as ChartType)}
                  className="gba:flex gba:gap-4"
                  data-testid={formatDataTestId(prefixDataTestId, 'chart-type-radio')}
                >
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <RadioGroupItem value="pie" id="chart-type-pie" />
                    <Label htmlFor="chart-type-pie" className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                      <PieChart className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.tiles.pieChart', 'Pie Chart')}
                    </Label>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <RadioGroupItem value="bar" id="chart-type-bar" />
                    <Label htmlFor="chart-type-bar" className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                      <BarChart3 className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.tiles.barChart', 'Bar Chart')}
                    </Label>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <RadioGroupItem value="line" id="chart-type-line" />
                    <Label htmlFor="chart-type-line" className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                      <LineChart className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.tiles.lineChart', 'Line Chart')}
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional Form Based on Chart Type */}
        {chartType === 'pie' && <PieChartForm form={form} prefixDataTestId={prefixDataTestId} />}
        {chartType === 'bar' && <BarChartForm form={form} prefixDataTestId={prefixDataTestId} />}
        {chartType === 'line' && <LineChartForm form={form} prefixDataTestId={prefixDataTestId} />}
      </div>
    </AppActionForm>
  )
}

// Pie Chart Form Component
const PieChartForm: React.FC<{ form: any; prefixDataTestId: string }> = ({ form, prefixDataTestId }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pieData'
  })

  const pieData = form.watch('pieData')
  const totalPercentage =
    pieData?.reduce((sum: number, item: any) => {
      const value = Number.parseFloat(item.percentage || '0')
      return sum + value
    }, 0) || 0

  const isOverLimit = totalPercentage > 100

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'pie-form')}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.pieDataLabel', 'Pie Chart Data')}
        </h4>
        <Alert
          variant={isOverLimit ? 'destructive' : 'default'}
          className="gba:w-auto gba:px-4 gba:py-2"
          data-testid={formatDataTestId(prefixDataTestId, 'percentage-total')}
        >
          <AlertDescription className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('investment.tiles.totalPercentage', 'Total')}:{' '}
            {totalPercentage.toFixed(1)}% / 100%
          </AlertDescription>
        </Alert>
      </div>

      <div className="gba:space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`pie-item-${index}`}>
            <FormField
              control={form.control}
              name={`pieData.${index}.name`}
              render={({ field }) => (
                <FormItem className="gba:flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.namePlaceholder', 'Item name')}
                      data-testid={formatDataTestId(prefixDataTestId, `pie-name-${index}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`pieData.${index}.percentage`}
              render={({ field }) => (
                <FormItem className="gba:w-32">
                  <FormControl>
                    <div className="gba:relative">
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        data-testid={formatDataTestId(prefixDataTestId, `pie-percentage-${index}`)}
                        className="gba:pr-8"
                      />
                      <span className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-sm gba:text-muted-foreground">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              data-testid={formatDataTestId(prefixDataTestId, `remove-pie-item-${index}`)}
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ id: generateChartDataId(), name: '', percentage: '' })}
        className="gba:w-full"
        data-testid={formatDataTestId(prefixDataTestId, 'add-pie-item')}
      >
        <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
        {getTranslationFromI18nKeyAndLabel('investment.tiles.addItem', 'Add Item')}
      </Button>
    </div>
  )
}

// Bar Chart Form Component
const BarChartForm: React.FC<{ form: any; prefixDataTestId: string }> = ({ form, prefixDataTestId }) => {
  const xAxisFields = useFieldArray({
    control: form.control,
    name: 'barData.xAxis'
  })

  const yAxisFields = useFieldArray({
    control: form.control,
    name: 'barData.yAxis'
  })

  return (
    <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'bar-form')}>
      {/* X Axis */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.xAxisLabel', 'X-Axis Data')}
        </h4>
        <div className="gba:space-y-3">
          {xAxisFields.fields.map((field, index) => (
            <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`x-axis-item-${index}`}>
              <FormField
                control={form.control}
                name={`barData.xAxis.${index}.name`}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.namePlaceholder', 'Name')}
                        data-testid={formatDataTestId(prefixDataTestId, `x-axis-name-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`barData.xAxis.${index}.amount`}
                render={({ field }) => (
                  <FormItem className="gba:w-32">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.amountPlaceholder', 'Amount')}
                        data-testid={formatDataTestId(prefixDataTestId, `x-axis-amount-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => xAxisFields.remove(index)}
                disabled={xAxisFields.fields.length === 1}
                data-testid={formatDataTestId(prefixDataTestId, `remove-x-axis-${index}`)}
              >
                <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => xAxisFields.append({ id: generateChartDataId(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-x-axis-item')}
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addXAxisPoint', 'Add X-Axis Point')}
        </Button>
      </div>

      {/* Y Axis */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.yAxisLabel', 'Y-Axis Data')}
        </h4>
        <div className="gba:space-y-3">
          {yAxisFields.fields.map((field, index) => (
            <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`y-axis-item-${index}`}>
              <FormField
                control={form.control}
                name={`barData.yAxis.${index}.name`}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.namePlaceholder', 'Name')}
                        data-testid={formatDataTestId(prefixDataTestId, `y-axis-name-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`barData.yAxis.${index}.amount`}
                render={({ field }) => (
                  <FormItem className="gba:w-32">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.amountPlaceholder', 'Amount')}
                        data-testid={formatDataTestId(prefixDataTestId, `y-axis-amount-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => yAxisFields.remove(index)}
                disabled={yAxisFields.fields.length === 1}
                data-testid={formatDataTestId(prefixDataTestId, `remove-y-axis-${index}`)}
              >
                <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => yAxisFields.append({ id: generateChartDataId(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-y-axis-item')}
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addYAxisPoint', 'Add Y-Axis Point')}
        </Button>
      </div>
    </div>
  )
}

// Line Chart Form Component (same as Bar Chart)
const LineChartForm: React.FC<{ form: any; prefixDataTestId: string }> = ({ form, prefixDataTestId }) => {
  const xAxisFields = useFieldArray({
    control: form.control,
    name: 'lineData.xAxis'
  })

  const yAxisFields = useFieldArray({
    control: form.control,
    name: 'lineData.yAxis'
  })

  return (
    <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'line-form')}>
      {/* X Axis */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.xAxisLabel', 'X-Axis Data')}
        </h4>
        <div className="gba:space-y-3">
          {xAxisFields.fields.map((field, index) => (
            <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`x-axis-item-${index}`}>
              <FormField
                control={form.control}
                name={`lineData.xAxis.${index}.name`}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.namePlaceholder', 'Name')}
                        data-testid={formatDataTestId(prefixDataTestId, `x-axis-name-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`lineData.xAxis.${index}.amount`}
                render={({ field }) => (
                  <FormItem className="gba:w-32">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.amountPlaceholder', 'Amount')}
                        data-testid={formatDataTestId(prefixDataTestId, `x-axis-amount-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => xAxisFields.remove(index)}
                disabled={xAxisFields.fields.length === 1}
                data-testid={formatDataTestId(prefixDataTestId, `remove-x-axis-${index}`)}
              >
                <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => xAxisFields.append({ id: generateChartDataId(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-x-axis-item')}
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addXAxisPoint', 'Add X-Axis Point')}
        </Button>
      </div>

      {/* Y Axis */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.yAxisLabel', 'Y-Axis Data')}
        </h4>
        <div className="gba:space-y-3">
          {yAxisFields.fields.map((field, index) => (
            <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`y-axis-item-${index}`}>
              <FormField
                control={form.control}
                name={`lineData.yAxis.${index}.name`}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.namePlaceholder', 'Name')}
                        data-testid={formatDataTestId(prefixDataTestId, `y-axis-name-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`lineData.yAxis.${index}.amount`}
                render={({ field }) => (
                  <FormItem className="gba:w-32">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.amountPlaceholder', 'Amount')}
                        data-testid={formatDataTestId(prefixDataTestId, `y-axis-amount-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => yAxisFields.remove(index)}
                disabled={yAxisFields.fields.length === 1}
                data-testid={formatDataTestId(prefixDataTestId, `remove-y-axis-${index}`)}
              >
                <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => yAxisFields.append({ id: generateChartDataId(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-y-axis-item')}
        >
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addYAxisPoint', 'Add Y-Axis Point')}
        </Button>
      </div>
    </div>
  )
}
