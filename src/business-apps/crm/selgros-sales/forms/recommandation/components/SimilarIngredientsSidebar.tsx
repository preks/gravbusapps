import React from 'react'
import { ScrollArea, Avatar, AvatarImage, AvatarFallback, Badge, Button, Separator } from '@newwork/nw-design-system'
import { PlusIcon, PackageIcon, SparkleIcon } from '@phosphor-icons/react'
import { SimilarIngredient } from '../types'

interface SimilarIngredientsSidebarProps {
  ingredients: SimilarIngredient[]
  onAddIngredient: (ingredient: SimilarIngredient) => void
}

export const SimilarIngredientsSidebar: React.FC<SimilarIngredientsSidebarProps> = ({
  ingredients,
  onAddIngredient
}) => {
  return (
    <div className="gba:w-[320px] gba:border-l gba:border-border gba:bg-muted/30 gba:flex gba:flex-col">
      {/* Header */}
      <div className="gba:p-4 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:gap-2">
          <SparkleIcon className="gba:w-5 gba:h-5 gba:text-amber-500" />
          <h3 className="gba:font-semibold gba:text-foreground">Suggested Additions</h3>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          Additional ingredients that might complement your selection
        </p>
      </div>

      {/* Ingredients List */}
      <ScrollArea className="gba:flex-1">
        <div className="gba:p-3 gba:space-y-2">
          {ingredients.map((ingredient, index) => (
            <React.Fragment key={ingredient.id}>
              <div
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-background gba:border gba:border-border hover:gba:border-primary/50 gba:transition-colors"
                data-testid={`similar-ingredient-${ingredient.id}`}
              >
                <Avatar className="gba:h-12 gba:w-12 gba:rounded-md gba:shrink-0">
                  <AvatarImage src={ingredient.imageUrl} alt={ingredient.name} className="gba:object-cover" />
                  <AvatarFallback className="gba:rounded-md">
                    <PackageIcon className="gba:w-5 gba:h-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="gba:flex-1 gba:min-w-0">
                  <h4 className="gba:text-sm gba:font-medium gba:truncate" title={ingredient.name}>
                    {ingredient.name}
                  </h4>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                    <Badge variant="outline" className="gba:text-xs">
                      {ingredient.category}
                    </Badge>
                  </div>
                  <div className="gba:text-sm gba:font-semibold gba:text-primary gba:mt-1">
                    {ingredient.pricePerUnit.toFixed(2)} {ingredient.currency}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:shrink-0 gba:h-8 gba:w-8 hover:gba:bg-primary hover:gba:text-primary-foreground"
                  onClick={() => onAddIngredient(ingredient)}
                  data-testid={`add-similar-ingredient-${ingredient.id}`}
                >
                  <PlusIcon className="gba:w-4 gba:h-4" />
                </Button>
              </div>
              {index < ingredients.length - 1 && <Separator className="gba:my-1" />}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="gba:p-3 gba:border-t gba:border-border gba:bg-background">
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
          Click <PlusIcon className="gba:inline gba:w-3 gba:h-3" /> to add to recommendations
        </p>
      </div>
    </div>
  )
}

export default SimilarIngredientsSidebar
