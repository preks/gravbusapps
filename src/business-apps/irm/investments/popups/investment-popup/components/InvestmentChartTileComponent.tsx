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
  RadioGroup,
  RadioGroupItem,
  Label
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, ChartPieIcon, ChartBarIcon, ChartLineIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { useTileSubmission } from '../hooks/useTileSubmission'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { INVESTMENT_ERRORS } from '../utils/investmentPopupUtils'
import {
  TileData,
  ChartType,
  ChartPieIconData,
  BarChartData,
  ChartLineIconData,
  findTileById
} from '@/common/components/investment/tiles'

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
    xAxisName: z.string().optional(),
    yAxisName: z.string().optional(),
    xAxis: z.array(barChartAxisItemSchema).min(1, 'At least one X-axis point is required'),
    yAxis: z.array(barChartAxisItemSchema).min(1, 'At least one Y-axis point is required')
  })
})

// Line chart validation schema (same as bar chart)
const lineChartSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  chartType: z.literal('line'),
  lineData: z.object({
    xAxisName: z.string().optional(),
    yAxisName: z.string().optional(),
    xAxis: z.array(barChartAxisItemSchema).min(1, 'At least one X-axis point is required'),
    yAxis: z.array(barChartAxisItemSchema).min(1, 'At least one Y-axis point is required')
  })
})

type ChartPieIconFormData = z.infer<typeof pieChartSchema>
type BarChartFormData = z.infer<typeof barChartSchema>
type ChartLineIconFormData = z.infer<typeof lineChartSchema>
type ChartTileFormData = ChartPieIconFormData | BarChartFormData | ChartLineIconFormData

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
  // Use common setup hook
  const {
    businessAppContext,
    investmentId,
    investment,
    loading: isLoadingInvestment,
    error
  } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
    scope: 'chart'
  })

  // Use tile submission hook
  const { isEditMode, buildTileSubmission } = useTileSubmission({
    investment,
    businessAppContext,
    tileId,
    tileType: 'CHART',
    businessKeyPrefix: 'investment-chart-tile'
  })

  const existingTile = isEditMode && investment && tileId ? findTileById(investment, tileId) : undefined
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
      pieData: [{ id: crypto.randomUUID(), name: '', percentage: '' }]
    } as any
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
        })) || [{ id: crypto.randomUUID(), name: '', percentage: '' }],
        barData: existingTile.chartData?.barData
          ? {
              xAxisName: existingTile.chartData.barData.xAxisName || '',
              yAxisName: existingTile.chartData.barData.yAxisName || '',
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
              xAxisName: '',
              yAxisName: '',
              xAxis: [{ id: crypto.randomUUID(), name: '', amount: '0' }],
              yAxis: [{ id: crypto.randomUUID(), name: '-', amount: '' }]
            },
        lineData: existingTile.chartData?.lineData
          ? {
              xAxisName: existingTile.chartData.lineData.xAxisName || '',
              yAxisName: existingTile.chartData.lineData.yAxisName || '',
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
              xAxisName: '',
              yAxisName: '',
              xAxis: [{ id: crypto.randomUUID(), name: '', amount: '' }],
              yAxis: [{ id: crypto.randomUUID(), name: '', amount: '' }]
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

  const handleSubmit = async (formData: ChartTileFormData) => {
    // Build chart data based on type
    const chartData: any = { chartType: formData.chartType }

    if (formData.chartType === 'pie' && 'pieData' in formData) {
      const pieData: ChartPieIconData[] = formData.pieData.map(item => ({
        id: item.id,
        name: item.name,
        percentage: Number.parseFloat(item.percentage)
      }))
      chartData.pieData = pieData
    } else if (formData.chartType === 'bar' && 'barData' in formData) {
      const barData: BarChartData = {
        xAxisName: formData.barData.xAxisName,
        yAxisName: formData.barData.yAxisName,
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
      const lineData: ChartLineIconData = {
        xAxisName: formData.lineData.xAxisName,
        yAxisName: formData.lineData.yAxisName,
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

    // Build tile submission with chart-specific data
    const { payload } = buildTileSubmission({
      title: formData.title,
      chartData
    })

    return payload
  }

  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType)
    form.setValue('chartType', newType as any)
  }

  return (
    <InvestmentPopupFormWrapper
      loading={isLoadingInvestment}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
      submitButtonText={
        isEditMode
          ? getTranslationFromI18nKeyAndLabel('investment.tiles.saveChanges', 'Save Changes')
          : getTranslationFromI18nKeyAndLabel('investment.tiles.createTile', 'Create Tile')
      }
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
                      <ChartPieIcon className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.tiles.pieChart', 'Pie Chart')}
                    </Label>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <RadioGroupItem value="bar" id="chart-type-bar" />
                    <Label htmlFor="chart-type-bar" className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                      <ChartBarIcon className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.tiles.barChart', 'Bar Chart')}
                    </Label>
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <RadioGroupItem value="line" id="chart-type-line" />
                    <Label htmlFor="chart-type-line" className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                      <ChartLineIcon className="gba:h-4 gba:w-4" />
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
        {chartType === 'pie' && <ChartPieIconForm form={form} prefixDataTestId={prefixDataTestId} />}
        {chartType === 'bar' && <BarChartForm form={form} prefixDataTestId={prefixDataTestId} />}
        {chartType === 'line' && <ChartLineIconForm form={form} prefixDataTestId={prefixDataTestId} />}
      </div>
    </InvestmentPopupFormWrapper>
  )
}

// Pie Chart Form Component
const ChartPieIconForm: React.FC<{ form: any; prefixDataTestId: string }> = ({ form, prefixDataTestId }) => {
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
              <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ id: crypto.randomUUID(), name: '', percentage: '' })}
        className="gba:w-full"
        data-testid={formatDataTestId(prefixDataTestId, 'add-pie-item')}
      >
        <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
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

  const handleAddDataPoint = () => {
    const newId = crypto.randomUUID()
    xAxisFields.append({ id: newId, name: '', amount: '0' })
    yAxisFields.append({ id: newId, name: '-', amount: '' })
  }

  const handleRemoveDataPoint = (index: number) => {
    xAxisFields.remove(index)
    yAxisFields.remove(index)
  }

  return (
    <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'bar-form')}>
      {/* Axis Name Labels - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="barData.xAxisName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.xAxisNameLabel', 'X-Axis Name')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.xAxisNamePlaceholder',
                    'Enter X-axis name (e.g., Month, Quarter, Year)'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'x-axis-name-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="barData.yAxisName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.yAxisNameLabel', 'Y-Axis Name')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.yAxisNamePlaceholder',
                    'Enter Y-axis name (e.g., Revenue, Sales, Units)'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'y-axis-name-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Data Points - X and Y Values Side by Side */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.dataPoints', 'Data Points')}
        </h4>
        <div className="gba:space-y-3">
          {xAxisFields.fields.map((field, index) => (
            <div key={field.id} className="gba:flex gba:gap-2 gba:items-start" data-testid={`data-point-${index}`}>
              <FormField
                control={form.control}
                name={`barData.xAxis.${index}.name`}
                render={({ field }) => (
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.xValuePlaceholder', 'X Value')}
                        data-testid={formatDataTestId(prefixDataTestId, `x-value-${index}`)}
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
                  <FormItem className="gba:flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder={getTranslationFromI18nKeyAndLabel('investment.tiles.yValuePlaceholder', 'Y Value')}
                        data-testid={formatDataTestId(prefixDataTestId, `y-value-${index}`)}
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
                onClick={() => handleRemoveDataPoint(index)}
                disabled={xAxisFields.fields.length === 1}
                data-testid={formatDataTestId(prefixDataTestId, `remove-data-point-${index}`)}
              >
                <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddDataPoint}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-data-point')}
        >
          <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addDataPoint', 'Add Data Point')}
        </Button>
      </div>
    </div>
  )
}

// Line Chart Form Component (same as Bar Chart)
const ChartLineIconForm: React.FC<{ form: any; prefixDataTestId: string }> = ({ form, prefixDataTestId }) => {
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
        <FormField
          control={form.control}
          name="lineData.xAxisName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.xAxisNameLabel', 'X-Axis Name')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.xAxisNamePlaceholder',
                    'Enter X-axis name (e.g., Month, Quarter, Year)'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'x-axis-name-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => xAxisFields.append({ id: crypto.randomUUID(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-x-axis-item')}
        >
          <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addXAxisPoint', 'Add X-Axis Point')}
        </Button>
      </div>

      {/* Y Axis */}
      <div className="gba:space-y-4">
        <h4 className="gba:text-sm gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.yAxisLabel', 'Y-Axis Data')}
        </h4>
        <FormField
          control={form.control}
          name="lineData.yAxisName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.yAxisNameLabel', 'Y-Axis Name')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.yAxisNamePlaceholder',
                    'Enter Y-axis name (e.g., Revenue, Sales, Units)'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'y-axis-name-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => yAxisFields.append({ id: crypto.randomUUID(), name: '', amount: '' })}
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, 'add-y-axis-item')}
        >
          <PlusIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('investment.tiles.addYAxisPoint', 'Add Y-Axis Point')}
        </Button>
      </div>
    </div>
  )
}
