import React from 'react'
import { WizardFormStep, type WizardStep } from '@newwork/nw-design-system'
import type { ProductAlternative, RecommendedProduct, RecommandationFormData } from './types'
import { MenuUploadStep, RecommendedProductsStep, AllAvailableProductsStep, FinalListStep } from './components'

interface UseRecommandationWizardStepsParams {
  menuPdfFile: File | null
  onMenuFileChange: (file: File | null) => void
  isExtractingMenu: boolean
  menuLoadingStepIndex: number
  extractMenuError: string | null
  onExtractMenu: () => Promise<boolean>
  recommendedProducts: RecommendedProduct[]
  searchTermStep1: string
  onSearchChangeStep1: (value: string) => void
  onSelectionChangeStep1: (productId: string, isSelected: boolean) => void
  onQuantityChangeStep1: (productId: string, quantity: number) => void
  onFetchAlternatives: (category: string, currentSku: string) => Promise<ProductAlternative[]>
  onSelectAlternative: (productId: string, alternative: ProductAlternative) => void
  allAvailableProducts: RecommendedProduct[]
  isLoadingAvailable: boolean
  searchTermStep2: string
  onSearchChangeStep2: (value: string) => void
  onSelectionChangeStep2: (productId: string, isSelected: boolean) => void
  onQuantityChangeStep2: (productId: string, quantity: number) => void
  onPriceChangeStep2: (productId: string, price: number) => void
  onMountAvailableProducts: () => void
  finalProducts: RecommendedProduct[]
  onSelectionChangeStep3: (productId: string, isSelected: boolean) => void
  onQuantityChangeStep3: (productId: string, quantity: number) => void
  onPriceChangeStep3: (productId: string, price: number) => void
  onMountFinalProducts: () => void
}

export const useRecommandationWizardSteps = ({
  menuPdfFile,
  onMenuFileChange,
  isExtractingMenu,
  menuLoadingStepIndex,
  extractMenuError,
  onExtractMenu,
  recommendedProducts,
  searchTermStep1,
  onSearchChangeStep1,
  onSelectionChangeStep1,
  onQuantityChangeStep1,
  onFetchAlternatives,
  onSelectAlternative,
  allAvailableProducts,
  isLoadingAvailable,
  searchTermStep2,
  onSearchChangeStep2,
  onSelectionChangeStep2,
  onQuantityChangeStep2,
  onPriceChangeStep2,
  onMountAvailableProducts,
  finalProducts,
  onSelectionChangeStep3,
  onQuantityChangeStep3,
  onPriceChangeStep3,
  onMountFinalProducts
}: UseRecommandationWizardStepsParams): WizardStep<RecommandationFormData>[] =>
  React.useMemo(
    () => [
      {
        id: 'upload-menu',
        title: 'Upload Menu',
        description: 'Upload a PDF menu so the AI can extract items',
        fields: [],
        onSubmit: onExtractMenu,
        content: (
          <WizardFormStep>
            <div className="gba:w-full" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              <MenuUploadStep
                selectedFile={menuPdfFile}
                onFileChange={onMenuFileChange}
                isLoading={isExtractingMenu}
                loadingStepIndex={menuLoadingStepIndex}
                errorMessage={extractMenuError}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'recommended-products',
        title: 'Recommended Products',
        description: 'AI-generated product recommendations based on the restaurant menu',
        fields: [],
        content: (
          <WizardFormStep>
            <div className="gba:w-full" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              <RecommendedProductsStep
                products={recommendedProducts}
                isLoading={false}
                loadingStepIndex={0}
                searchTerm={searchTermStep1}
                onSearchChange={onSearchChangeStep1}
                onSelectionChange={onSelectionChangeStep1}
                onQuantityChange={onQuantityChangeStep1}
                onFetchAlternatives={onFetchAlternatives}
                onSelectAlternative={onSelectAlternative}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'all-available-products',
        title: 'All Available Products',
        description: 'Browse and select additional products from the complete inventory',
        fields: [],
        content: (
          <WizardFormStep>
            <div className="gba:w-full" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              <AllAvailableProductsStep
                products={allAvailableProducts}
                isLoading={isLoadingAvailable}
                searchTerm={searchTermStep2}
                onSearchChange={onSearchChangeStep2}
                onSelectionChange={onSelectionChangeStep2}
                onQuantityChange={onQuantityChangeStep2}
                onPriceChange={onPriceChangeStep2}
                onMount={onMountAvailableProducts}
              />
            </div>
          </WizardFormStep>
        )
      },
      {
        id: 'final-list',
        title: 'Final Product List',
        description: 'Review and adjust your final selection before generating the document',
        fields: [],
        content: (
          <WizardFormStep>
            <div className="gba:w-full" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              <FinalListStep
                products={finalProducts}
                onSelectionChange={onSelectionChangeStep3}
                onQuantityChange={onQuantityChangeStep3}
                onPriceChange={onPriceChangeStep3}
                onMount={onMountFinalProducts}
              />
            </div>
          </WizardFormStep>
        )
      }
    ],
    [
      menuPdfFile,
      onMenuFileChange,
      isExtractingMenu,
      menuLoadingStepIndex,
      extractMenuError,
      onExtractMenu,
      recommendedProducts,
      searchTermStep1,
      onSearchChangeStep1,
      onSelectionChangeStep1,
      onQuantityChangeStep1,
      onFetchAlternatives,
      onSelectAlternative,
      allAvailableProducts,
      isLoadingAvailable,
      searchTermStep2,
      onSearchChangeStep2,
      onSelectionChangeStep2,
      onQuantityChangeStep2,
      onPriceChangeStep2,
      onMountAvailableProducts,
      finalProducts,
      onSelectionChangeStep3,
      onQuantityChangeStep3,
      onPriceChangeStep3,
      onMountFinalProducts
    ]
  )

export default useRecommandationWizardSteps
