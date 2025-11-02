import React from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import type { TranslationScope } from '../hooks/useTranslationTree'
import { TranslationTree, buildTree } from './TranslationTree'

interface ScopeTreeProps {
  scopes: TranslationScope[]
  isLoading: boolean
  onSelect: (scopePath: string) => void
  selected: string
}

const ScopeTree: React.FC<ScopeTreeProps> = ({ scopes, isLoading, onSelect, selected }) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:p-8 gba:gap-2 gba:text-muted-foreground">
        <Spinner size="sm" />
        <span>Loading scopes...</span>
      </div>
    )
  }

  if (scopes.length === 0) {
    return (
      <Alert>
        <AlertDescription>No translation scopes found</AlertDescription>
      </Alert>
    )
  }

  // Convert TranslationScope to Node format for TranslationTree
  const nodes = scopes.map(scope => ({
    path: scope.path,
    hasI18n: true,
    locales: scope.files.map(file => {
      const filename = file.split('/').pop() || ''
      return filename.replace('.ftl', '')
    })
  }))

  console.log('[ScopeTree] Building tree from nodes:', JSON.stringify(nodes, null, 2))
  const treeNodes = buildTree(nodes)
  console.log('[ScopeTree] Tree nodes:', JSON.stringify(treeNodes, null, 2))

  return <TranslationTree nodes={treeNodes} onSelectScope={onSelect} selectedScope={selected} />
}

export default ScopeTree
