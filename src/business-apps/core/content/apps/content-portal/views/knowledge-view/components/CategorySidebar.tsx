import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { Folder, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  value: string
  code?: string
}

interface CategorySidebarProps {
  categories: Category[]
  isLoading: boolean
  selectedCategoryRef: string | null
  onCategoryClick: (categoryRef: string | null) => void
  t: (key: string) => string
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  isLoading,
  selectedCategoryRef,
  onCategoryClick,
  t
}) => {
  return (
    <div className="gba:sticky gba:top-4 gba:h-fit">
      <Card className="gba:p-4">
        <h3 className="gba:text-sm gba:font-semibold gba:mb-4 gba:text-muted-foreground gba:uppercase">
          {t('categories')}
        </h3>

        {isLoading ? (
          <div className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('loading')}</div>
        ) : (
          <nav className="gba:space-y-1">
            <button
              onClick={() => onCategoryClick(null)}
              className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                selectedCategoryRef === null
                  ? 'gba:bg-primary gba:text-primary-foreground'
                  : 'gba:hover:bg-accent gba:text-foreground'
              }`}
              data-testid="knowledge-category-all"
            >
              <span className="gba:flex gba:items-center gba:gap-2">
                <Folder className="gba:w-4 gba:h-4" />
                {t('all_articles')}
              </span>
              <ChevronRight className="gba:w-4 gba:h-4" />
            </button>

            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                  selectedCategoryRef === category.id
                    ? 'gba:bg-primary gba:text-primary-foreground'
                    : 'gba:hover:bg-accent gba:text-foreground'
                }`}
                data-testid={`knowledge-category-${category.code?.toLowerCase()}`}
              >
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Folder className="gba:w-4 gba:h-4" />
                  {category.value}
                </span>
                <ChevronRight className="gba:w-4 gba:h-4" />
              </button>
            ))}
          </nav>
        )}
      </Card>
    </div>
  )
}

export default CategorySidebar
