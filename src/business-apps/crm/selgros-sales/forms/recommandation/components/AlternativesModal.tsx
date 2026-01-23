import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  ScrollArea,
  Spinner
} from '@newwork/nw-design-system'
import { CheckIcon, PackageIcon } from '@phosphor-icons/react'
import { ProductAlternative } from '../types'

interface AlternativesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  alternatives: ProductAlternative[]
  onSelectAlternative: (alternative: ProductAlternative) => void
  isLoading?: boolean
}

export const AlternativesModal: React.FC<AlternativesModalProps> = ({
  open,
  onOpenChange,
  productName,
  alternatives,
  onSelectAlternative,
  isLoading = false
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (alternative: ProductAlternative) => {
    setSelectedId(alternative.id)
    onSelectAlternative(alternative)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alternative Products</DialogTitle>
          <DialogDescription>
            Choose an alternative for <span className="gba:font-semibold">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="gba:max-h-[400px] gba:pr-4">
          <div className="gba:space-y-3">
            {isLoading ? (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-muted-foreground">
                <Spinner size="sm" />
                <p className="gba:mt-2">Loading alternatives...</p>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-muted-foreground">
                <PackageIcon className="gba:w-12 gba:h-12 gba:mb-2 gba:opacity-50" />
                <p>No alternatives available for this product</p>
              </div>
            ) : (
              alternatives.map(alt => (
                <div
                  key={alt.id}
                  className={`gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:cursor-pointer gba:transition-all hover:gba:border-primary hover:gba:bg-primary/5 ${
                    selectedId === alt.id ? 'gba:border-primary gba:bg-primary/10' : 'gba:border-border'
                  }`}
                  onClick={() => handleSelect(alt)}
                  data-testid={`alternative-item-${alt.id}`}
                >
                  <Avatar className="gba:h-16 gba:w-16 gba:rounded-md">
                    <AvatarImage src={alt.imageUrl} alt={alt.name} className="gba:object-cover" />
                    <AvatarFallback className="gba:rounded-md">
                      <PackageIcon className="gba:w-6 gba:h-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <h4 className="gba:font-medium gba:truncate">{alt.name}</h4>
                      <Badge variant="secondary" className="gba:shrink-0">
                        {alt.brand}
                      </Badge>
                    </div>
                    {alt.description && (
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-2">
                        {alt.description}
                      </p>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
                      <span className="gba:text-sm gba:font-mono gba:text-muted-foreground">{alt.sku}</span>
                    </div>
                  </div>

                  <div className="gba:text-right gba:shrink-0">
                    <div className="gba:text-lg gba:font-semibold gba:text-primary">
                      {alt.pricePerUnit.toFixed(2)} {alt.currency}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground">per unit</div>
                  </div>

                  {selectedId === alt.id && (
                    <div className="gba:shrink-0">
                      <CheckIcon className="gba:w-5 gba:h-5 gba:text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AlternativesModal
