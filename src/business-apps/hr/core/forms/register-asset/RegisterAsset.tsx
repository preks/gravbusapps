/**
 * RegisterAsset Form
 * Form for registering new equipment in the inventory
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCurrencyCatalog } from './hooks/useCurrencyCatalog'
import { useAssetsCatalog } from './hooks/useAssetsCatalog'
import { useBrandsCatalog } from './hooks/useBrandsCatalog'
import { useAssetService } from '../../apps/assets/services/useAssetService'

const formSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  brand: z.string().min(1, 'Please select a brand'),
  model: z.string().min(2, 'Model must be at least 2 characters'),
  serialNumber: z.string().min(3, 'Serial number must be at least 3 characters'),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  warrantyPeriodMonths: z.coerce
    .number()
    .min(0, 'Warranty period must be 0 or greater')
    .max(120, 'Warranty period cannot exceed 120 months'),
  inventoryValue: z.coerce.number().min(0, 'Inventory value must be 0 or greater'),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

interface RegisterAssetProps extends BusinessAppContextProps {
  onSuccess?: () => void
}

export const RegisterAsset: React.FC<RegisterAssetProps> = ({ onSuccess, ...props }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use catalog and data hooks
  const { options: currencyOptions, isLoading: currenciesLoading } = useCurrencyCatalog(props)
  const { options: assetOptions, isLoading: assetsLoading } = useAssetsCatalog(props)
  const { options: brandOptions, isLoading: brandsLoading } = useBrandsCatalog(props)

  // Initialize asset service for GraphQL mutations
  const assetService = useAssetService(props)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Enable validation on change
    defaultValues: {
      category: '',
      brand: '',
      model: '',
      serialNumber: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      warrantyPeriodMonths: 24,
      inventoryValue: 0,
      currency: '',
      notes: ''
    }
  })

  // Set default currency once options are loaded
  useEffect(() => {
    if (currencyOptions.length > 0 && !form.getValues('currency')) {
      const eurCurrency = currencyOptions.find(c => c.code === 'EUR' || c.label.includes('EUR'))
      form.setValue('currency', eurCurrency?.value || currencyOptions[0].value)
    }
  }, [currencyOptions]) // Removed 'form' to prevent infinite loop

  // Set default asset category once options are loaded
  useEffect(() => {
    if (assetOptions.length > 0 && !form.getValues('category')) {
      const laptopCategory = assetOptions.find(c => c.value === 'Laptop' || c.label.includes('Laptop'))
      form.setValue('category', laptopCategory?.value || assetOptions[0].value)
    }
  }, [assetOptions]) // Removed 'form' to prevent infinite loop

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      // Create asset using GraphQL service with correct field mappings
      const newAsset = await assetService.createAsset({
        model: values.model,
        serialNumber: values.serialNumber,
        acquisitionDate: values.acquisitionDate,
        warrantyPeriodMonths: values.warrantyPeriodMonths,
        inventoryValue: values.inventoryValue,
        assetStatus: 'AVAILABLE_ASSET',
        assetBrandRef: values.brand, // Brand catalog ID
        assetCategoryRef: values.category, // Category catalog ID
        currencyRef: values.currency, // Currency catalog ID
        notes: values.notes
      })

      console.log('Asset registered successfully:', newAsset.id)

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error registering asset:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div data-testid="register-asset-form">
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-4">
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={assetsLoading}>
                    <FormControl>
                      <SelectTrigger data-testid="category-select">
                        <SelectValue
                          placeholder={assetsLoading ? 'Loading categories...' : 'Select equipment category'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetOptions.map(asset => (
                        <SelectItem key={asset.id} value={asset.value} data-testid={`category-option-${asset.code}`}>
                          {asset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Type of equipment being registered</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand and Model - Side by side */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={brandsLoading}>
                      <FormControl>
                        <SelectTrigger data-testid="brand-select">
                          <SelectValue placeholder={brandsLoading ? 'Loading brands...' : 'Select brand'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brandOptions.map(brand => (
                          <SelectItem key={brand.id} value={brand.id} data-testid={`brand-option-${brand.code}`}>
                            {brand.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MacBook Pro 14" {...field} data-testid="model-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Serial Number */}
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Unique serial number"
                      {...field}
                      data-testid="serial-number-input"
                      className="gba:font-mono"
                    />
                  </FormControl>
                  <FormDescription>Unique identifier for this equipment</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Acquisition Date and Warranty Period */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="acquisitionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquisition Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="acquisition-date-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warrantyPeriodMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty (months) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="120" {...field} data-testid="warranty-period-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Inventory Value and Currency */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:items-start">
              <FormField
                control={form.control}
                name="inventoryValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Value *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="inventory-value-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={currenciesLoading}>
                      <FormControl>
                        <SelectTrigger data-testid="currency-select">
                          <SelectValue placeholder={currenciesLoading ? 'Loading...' : 'Select currency'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map(currency => (
                          <SelectItem
                            key={currency.id}
                            value={currency.value}
                            data-testid={`currency-option-${currency.name}`}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:-mt-3">Purchase or estimated value</div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information about this equipment..."
                      className="gba:min-h-[80px]"
                      {...field}
                      data-testid="notes-textarea"
                    />
                  </FormControl>
                  <FormDescription>Optional: Any additional details or comments</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:flex gba:gap-2 gba:pt-4">
              <Button
                type="submit"
                disabled={
                  isSubmitting || currenciesLoading || assetsLoading || brandsLoading || !form.formState.isValid
                }
                data-testid="register-submit-button"
              >
                {isSubmitting ? 'Registering...' : 'Register Equipment'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default RegisterAsset
