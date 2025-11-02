import React from 'react'
import { Card, CardContent, Input, Badge } from '@newwork/nw-design-system'

interface TranslationKey {
  id: string
  needsReview: boolean
  isReviewed: boolean
}

interface TranslationKeyListProps {
  keys: TranslationKey[]
  selectedKey: string | null
  onSelectKey: (keyId: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

const TranslationKeyList: React.FC<TranslationKeyListProps> = ({
  keys,
  selectedKey,
  onSelectKey,
  searchTerm,
  onSearchChange
}) => {
  const filteredKeys = keys.filter(k => k.id.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Card className="gba:h-full gba:flex gba:flex-col">
      <CardContent className="gba:p-4 gba:flex gba:flex-col gba:gap-4 gba:h-full">
        {/* Search */}
        <Input
          placeholder="Search keys..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:w-full"
        />

        {/* Key count */}
        <div className="gba:text-sm gba:text-muted-foreground">
          {filteredKeys.length} of {keys.length} keys
        </div>

        {/* Key list */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-1">
          {filteredKeys.map(key => (
            <div
              key={key.id}
              onClick={() => onSelectKey(key.id)}
              className={`
                gba:p-3 gba:rounded-md gba:cursor-pointer gba:transition-colors
                gba:flex gba:items-center gba:justify-between gba:gap-2
                ${selectedKey === key.id ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted'}
              `}
            >
              <code className="gba:text-xs gba:flex-1 gba:truncate">{key.id}</code>

              <div className="gba:flex gba:gap-1">
                {key.needsReview && (
                  <Badge variant="warning" className="gba:text-xs gba:px-1.5 gba:py-0">
                    Review
                  </Badge>
                )}
                {key.isReviewed && (
                  <Badge variant="success" className="gba:text-xs gba:px-1.5 gba:py-0">
                    ✓
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TranslationKeyList
