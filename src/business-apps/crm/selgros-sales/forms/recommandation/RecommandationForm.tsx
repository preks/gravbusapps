import { toast, Button } from '@newwork/nw-design-system'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { FilePdf, FileCsv, Envelope } from '@phosphor-icons/react'

import { ProductAlternative, RecommendedProduct, RecommandationFormData } from './types'
import { extractMenuRecommendations, fetchAvailableProducts, searchAvailableProducts } from './recommendationApi'
import { useRecommandationWizardSteps } from './useRecommandationWizardSteps'
import { exportToPDF, exportToCSV } from './utils/exportUtils'

const DATA_TEST_ID_PREFIX = 'RecommandationForm'

export interface RecommandationFormProps extends BusinessAppContextProps {
  onSuccess?: (data: RecommandationFormData) => void
  onCancel?: () => void
  showHeader?: boolean
}

export const RecommandationForm: React.FC<RecommandationFormProps> = ({ accessToken, additionalData, onCancel }) => {
  // State for Step 1: Menu upload + extraction
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null)
  const [isExtractingMenu, setIsExtractingMenu] = useState(false)
  const [extractMenuError, setExtractMenuError] = useState<string | null>(null)
  const [menuLoadingStepIndex, setMenuLoadingStepIndex] = useState(0)

  // State for Step 2: Recommended Products
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [searchTermStep1, setSearchTermStep1] = useState('')

  // State for Step 3: All Available Products
  const [allAvailableProducts, setAllAvailableProducts] = useState<RecommendedProduct[]>([])
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false)
  const [isSearchingAvailable, setIsSearchingAvailable] = useState(false)
  const [availableSearchResults, setAvailableSearchResults] = useState<RecommendedProduct[]>([])
  const [searchTermStep2, setSearchTermStep2] = useState('')

  // State for Step 4: Final List (combined)
  const [finalProducts, setFinalProducts] = useState<RecommendedProduct[]>([])

  // State for document generation
  const [documentsGenerated, setDocumentsGenerated] = useState(false)
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false)

  // Form
  const form = useForm<RecommandationFormData>({
    defaultValues: {
      selectedProducts: [],
      clientName: additionalData?.clientName || '',
      clientType: additionalData?.clientType || ''
    }
  })

  const handleExtractMenu = useCallback(async () => {
    if (!menuPdfFile) {
      setExtractMenuError('Please upload a PDF menu to continue.')
      return false
    }

    if (!accessToken) {
      setExtractMenuError('Authentication required to analyze the menu.')
      toast.error('Authentication required to analyze the menu.')
      return false
    }

    setIsExtractingMenu(true)
    setExtractMenuError(null)
    setMenuLoadingStepIndex(0)

    const MENU_PROCESSING_STEPS = [
      'Uploading menu PDF…',
      'Extracting text from PDF…',
      'Analyzing menu structure…',
      'Identifying dishes and items…',
      'Mapping items to ingredients…',
      'Generating recommendations…'
    ] as const

    const totalSteps = MENU_PROCESSING_STEPS.length
    const normalStepDurationMs = 800 // Normal duration per step
    const fastStepDurationMs = 400 // Fast duration when call completes early

    // Extra delays for specific steps
    const STEP_EXTRA_DELAYS: Record<number, number> = {
      2: 5000, // "Analyzing menu structure" - 5000ms
      3: 2000, // "Identifying dishes and items" - 2000ms
      4: 3000 // "Mapping items to ingredients" - 3000ms
    }

    let currentStep = 0
    let isCancelled = false
    let stepInterval: NodeJS.Timeout | null = null
    let isCallCompleted = false

    // Function to advance to next step
    const advanceStep = () => {
      if (isCancelled) {
        if (stepInterval) clearInterval(stepInterval)
        return
      }
      currentStep = Math.min(currentStep + 1, totalSteps - 1)
      setMenuLoadingStepIndex(currentStep)

      // If we've reached the last step, stop the interval
      if (currentStep >= totalSteps - 1) {
        if (stepInterval) clearInterval(stepInterval)
        return
      }

      // Special handling for steps with extra delays
      const extraDelay = STEP_EXTRA_DELAYS[currentStep]
      if (extraDelay && !isCallCompleted) {
        // Clear current interval
        if (stepInterval) clearInterval(stepInterval)

        // Wait extra delay at this step, then continue
        setTimeout(() => {
          if (!isCancelled && !isCallCompleted) {
            // Continue with normal interval after the delay
            stepInterval = setInterval(advanceStep, normalStepDurationMs)
          }
        }, extraDelay)
      }
    }

    // Start the step progression interval
    stepInterval = setInterval(advanceStep, normalStepDurationMs)

    try {
      const result = await extractMenuRecommendations({
        accessToken,
        pdfFile: menuPdfFile
      })

      // Call completed - accelerate remaining steps if needed
      isCallCompleted = true

      // If we're not at the last step yet, accelerate the interval
      if (currentStep < totalSteps - 1 && stepInterval) {
        clearInterval(stepInterval)
        // Accelerate to finish remaining steps quickly
        stepInterval = setInterval(() => {
          if (isCancelled) {
            if (stepInterval) clearInterval(stepInterval)
            return
          }
          currentStep = Math.min(currentStep + 1, totalSteps - 1)
          setMenuLoadingStepIndex(currentStep)
          if (currentStep >= totalSteps - 1) {
            if (stepInterval) clearInterval(stepInterval)
          }
        }, fastStepDurationMs)
      }

      // Wait for steps to complete, then finish
      const waitForSteps = new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (currentStep >= totalSteps - 1) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })

      await waitForSteps

      // Cancel interval and set final step
      isCancelled = true
      if (stepInterval) clearInterval(stepInterval)
      setMenuLoadingStepIndex(totalSteps - 1)

      setRecommendedProducts(result.recommended)
      setIsExtractingMenu(false)
      return true
    } catch (error: any) {
      console.error('Error extracting menu items:', error?.message || error)
      isCancelled = true
      if (stepInterval) clearInterval(stepInterval)
      setIsExtractingMenu(false)
      setExtractMenuError('We could not extract menu items. Please try again.')
      toast.error('We could not extract menu items. Please try again.')
      return false
    }
  }, [accessToken, menuPdfFile])

  const handleMenuFileChange = useCallback((file: File | null) => {
    setMenuPdfFile(file)
    if (file) {
      setExtractMenuError(null)
    }
  }, [])

  // Load products list (Step 3) - only when moving to step 3
  const loadAvailableProducts = useCallback(async () => {
    if (isLoadingAvailable || allAvailableProducts.length > 0) {
      return // Already loaded or loading
    }

    if (!accessToken) {
      toast.error('Authentication required to load products')
      return
    }

    setIsLoadingAvailable(true)
    try {
      const products = await fetchAvailableProducts({ accessToken })
      setAllAvailableProducts(products)
    } catch (error: any) {
      console.error('Error loading spreadsheet:', error)
      toast.error('Failed to load products from inventory')
    } finally {
      setIsLoadingAvailable(false)
    }
  }, [accessToken, isLoadingAvailable, allAvailableProducts.length])

  useEffect(() => {
    let isCancelled = false

    if (!searchTermStep2.trim()) {
      setAvailableSearchResults([])
      setIsSearchingAvailable(false)
      return () => {
        isCancelled = true
      }
    }

    if (!accessToken) {
      setAvailableSearchResults([])
      setIsSearchingAvailable(false)
      toast.error('Authentication required to search products')
      return () => {
        isCancelled = true
      }
    }

    setIsSearchingAvailable(true)

    const timeoutId = window.setTimeout(() => {
      searchAvailableProducts({ accessToken, query: searchTermStep2.trim() })
        .then(results => {
          if (!isCancelled) {
            setAvailableSearchResults(
              results.map(result => {
                const existing = allAvailableProducts.find(
                  product => product.id === result.id || product.sku === result.sku
                )
                return existing ? { ...result, isSelected: existing.isSelected, quantity: existing.quantity } : result
              })
            )
          }
        })
        .catch(error => {
          if (!isCancelled) {
            console.error('Error searching products:', error?.message || error)
            toast.error('Failed to search products')
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsSearchingAvailable(false)
          }
        })
    }, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [accessToken, searchTermStep2, allAvailableProducts])

  const visibleAvailableProducts = useMemo(
    () => (searchTermStep2.trim() ? availableSearchResults : allAvailableProducts),
    [searchTermStep2, availableSearchResults, allAvailableProducts]
  )

  // Handlers for Step 1
  const handleStep1SelectionChange = useCallback((productId: string, isSelected: boolean) => {
    setRecommendedProducts(prev => prev.map(p => (p.id === productId ? { ...p, isSelected } : p)))
  }, [])

  const handleStep1QuantityChange = useCallback((productId: string, quantity: number) => {
    setRecommendedProducts(prev => prev.map(p => (p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p)))
  }, [])

  // Handlers for Step 2
  const handleStep2SelectionChange = useCallback(
    (productId: string, isSelected: boolean) => {
      setAllAvailableProducts(prev => {
        const existing = prev.find(product => product.id === productId)
        if (!existing) {
          const fromSearch = availableSearchResults.find(product => product.id === productId)
          if (!fromSearch) return prev
          return [...prev, { ...fromSearch, isSelected }]
        }
        return prev.map(product => (product.id === productId ? { ...product, isSelected } : product))
      })
      setAvailableSearchResults(prev =>
        prev.map(product => (product.id === productId ? { ...product, isSelected } : product))
      )
    },
    [availableSearchResults]
  )

  const handleStep2QuantityChange = useCallback(
    (productId: string, quantity: number) => {
      setAllAvailableProducts(prev => {
        const existing = prev.find(product => product.id === productId)
        if (!existing) {
          const fromSearch = availableSearchResults.find(product => product.id === productId)
          if (!fromSearch) return prev
          return [...prev, { ...fromSearch, quantity: Math.max(1, quantity) }]
        }
        return prev.map(product =>
          product.id === productId ? { ...product, quantity: Math.max(1, quantity) } : product
        )
      })
      setAvailableSearchResults(prev =>
        prev.map(product => (product.id === productId ? { ...product, quantity: Math.max(1, quantity) } : product))
      )
    },
    [availableSearchResults]
  )

  const handleStep2PriceChange = useCallback(
    (productId: string, price: number) => {
      setAllAvailableProducts(prev => {
        const existing = prev.find(product => product.id === productId)
        if (!existing) {
          const fromSearch = availableSearchResults.find(product => product.id === productId)
          if (!fromSearch) return prev
          return [...prev, { ...fromSearch, pricePerUnit: Math.max(0, price) }]
        }
        return prev.map(product =>
          product.id === productId ? { ...product, pricePerUnit: Math.max(0, price) } : product
        )
      })
      setAvailableSearchResults(prev =>
        prev.map(product => (product.id === productId ? { ...product, pricePerUnit: Math.max(0, price) } : product))
      )
    },
    [availableSearchResults]
  )

  // Handlers for Step 3
  const handleStep3SelectionChange = useCallback((productId: string, isSelected: boolean) => {
    setFinalProducts(prev => prev.map(p => (p.id === productId ? { ...p, isSelected } : p)))
  }, [])

  const handleStep3QuantityChange = useCallback((productId: string, quantity: number) => {
    setFinalProducts(prev => prev.map(p => (p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p)))
  }, [])

  const handleStep3PriceChange = useCallback((productId: string, price: number) => {
    setFinalProducts(prev => prev.map(p => (p.id === productId ? { ...p, pricePerUnit: Math.max(0, price) } : p)))
  }, [])

  // Combine products when moving from Step 2 to Step 3
  const combineProductsForFinalStep = useCallback(() => {
    const selectedRecommended = recommendedProducts.filter(p => p.isSelected)
    const selectedAvailable = allAvailableProducts.filter(p => p.isSelected)

    // Merge products, avoiding duplicates by SKU
    const mergedProducts: RecommendedProduct[] = []
    const skuMap = new Map<string, RecommendedProduct>()

    // Add recommended products first
    selectedRecommended.forEach(p => {
      skuMap.set(p.sku, { ...p })
      mergedProducts.push({ ...p })
    })

    // Add available products (skip if SKU already exists)
    selectedAvailable.forEach(p => {
      if (!skuMap.has(p.sku)) {
        mergedProducts.push({ ...p })
        skuMap.set(p.sku, p)
      }
    })

    setFinalProducts(mergedProducts)
  }, [recommendedProducts, allAvailableProducts])

  const handleAlternativeSelect = useCallback((productId: string, alternative: ProductAlternative) => {
    setRecommendedProducts(prev =>
      prev.map(product => {
        if (product.id !== productId) return product

        // Use alternative quantity if it's a valid number (including 0), otherwise keep existing quantity
        const newQuantity =
          alternative.quantity !== undefined && typeof alternative.quantity === 'number'
            ? Math.max(1, alternative.quantity) // Ensure at least 1
            : product.quantity

        // Use alternative stock if defined, otherwise keep existing stock
        const newStock = alternative.stock !== undefined ? alternative.stock : product.stock

        return {
          ...product,
          name: alternative.name,
          pricePerUnit: alternative.pricePerUnit,
          currency: alternative.currency,
          brand: alternative.brand,
          sku: alternative.sku,
          imageUrl: alternative.imageUrl || product.imageUrl,
          quantity: newQuantity,
          stock: newStock
          // Keep existing unitOfMeasure, isSelected, source
        }
      })
    )
  }, [])

  const handleFetchAlternatives = useCallback(
    async (category: string, currentSku: string) => {
      if (!accessToken) {
        toast.error('Authentication required to load alternatives')
        return []
      }

      try {
        const results = await searchAvailableProducts({ accessToken, query: category })
        return results
          .filter(product => product.sku !== currentSku)
          .map(product => ({
            id: product.id,
            name: product.name,
            imageUrl: '',
            pricePerUnit: product.pricePerUnit,
            currency: product.currency,
            brand: product.brand,
            sku: product.sku,
            stock: product.stock,
            quantity: product.quantity
          }))
      } catch (error: any) {
        console.error('Error loading alternatives:', error?.message || error)
        toast.error('Failed to load alternatives')
        return []
      }
    },
    [accessToken]
  )

  const wizardSteps = useRecommandationWizardSteps({
    menuPdfFile,
    onMenuFileChange: handleMenuFileChange,
    isExtractingMenu,
    menuLoadingStepIndex,
    extractMenuError,
    onExtractMenu: handleExtractMenu,
    recommendedProducts,
    searchTermStep1,
    onSearchChangeStep1: setSearchTermStep1,
    onSelectionChangeStep1: handleStep1SelectionChange,
    onQuantityChangeStep1: handleStep1QuantityChange,
    onFetchAlternatives: handleFetchAlternatives,
    onSelectAlternative: handleAlternativeSelect,
    allAvailableProducts: visibleAvailableProducts,
    isLoadingAvailable: isLoadingAvailable || isSearchingAvailable,
    searchTermStep2,
    onSearchChangeStep2: setSearchTermStep2,
    onSelectionChangeStep2: handleStep2SelectionChange,
    onQuantityChangeStep2: handleStep2QuantityChange,
    onPriceChangeStep2: handleStep2PriceChange,
    onMountAvailableProducts: loadAvailableProducts,
    finalProducts,
    onSelectionChangeStep3: handleStep3SelectionChange,
    onQuantityChangeStep3: handleStep3QuantityChange,
    onPriceChangeStep3: handleStep3PriceChange,
    onMountFinalProducts: combineProductsForFinalStep
  })

  const handleSubmit = useCallback(
    async (data: RecommandationFormData) => {
      setIsGeneratingDocuments(true)

      // Simulate document generation delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      const selectedProducts = finalProducts.filter(p => p.isSelected)

      setIsGeneratingDocuments(false)
      setDocumentsGenerated(true)

      return {
        selectedProducts,
        clientName: data.clientName,
        clientType: data.clientType,
        generatedAt: new Date().toISOString()
      }
    },
    [finalProducts]
  )

  const handleSuccess = useCallback(() => {
    toast.success('Document generated successfully!')
    // Don't call onSuccess immediately - wait for user to download or send email
  }, [])

  const handleDownloadPDF = useCallback(() => {
    try {
      const clientName = form.getValues().clientName
      exportToPDF(finalProducts, clientName)
      toast.success('PDF download started')
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      toast.error(error.message || 'Failed to export PDF')
    }
  }, [finalProducts, form])

  const handleDownloadCSV = useCallback(() => {
    try {
      const clientName = form.getValues().clientName
      exportToCSV(finalProducts, clientName)
      toast.success('CSV download started')
    } catch (error: any) {
      console.error('Error exporting CSV:', error)
      toast.error(error.message || 'Failed to export CSV')
    }
  }, [finalProducts, form])

  const handleSendEmail = useCallback(() => {
    // TODO: Implement email sending
    toast.info('Email functionality will be implemented soon')
  }, [])

  const handleCancel = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      <AppActionForm
        processType="create"
        formType="wizard"
        form={form}
        formData={form.getValues()}
        wizardSteps={wizardSteps}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        submitButtonText={isGeneratingDocuments ? 'Generating...' : 'Generate Document'}
        cancelButtonText="Cancel"
        showCancelButton={true}
        allowStepJumping={false}
        wizardFormClassName="gba:[&&&_form>div]:max-w-7xl"
        isWizardNextDisabled={isExtractingMenu}
        isSubmitDisabled={isGeneratingDocuments || documentsGenerated}
        customActions={
          documentsGenerated ? (
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                onClick={handleDownloadPDF}
                variant="default"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${DATA_TEST_ID_PREFIX}-download-pdf`}
              >
                <FilePdf className="gba:w-4 gba:h-4" />
                Download PDF
              </Button>
              <Button
                onClick={handleDownloadCSV}
                variant="default"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${DATA_TEST_ID_PREFIX}-download-csv`}
              >
                <FileCsv className="gba:w-4 gba:h-4" />
                Download CSV
              </Button>
              <Button
                onClick={handleSendEmail}
                variant="outline"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${DATA_TEST_ID_PREFIX}-send-email`}
              >
                <Envelope className="gba:w-4 gba:h-4" />
                Send Email
              </Button>
            </div>
          ) : undefined
        }
        data-testid={DATA_TEST_ID_PREFIX}
      >
        {null}
      </AppActionForm>
    </div>
  )
}

export default RecommandationForm
