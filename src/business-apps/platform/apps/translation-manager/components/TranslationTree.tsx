import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { File } from '@phosphor-icons/react'

interface TreeNode {
  name: string
  fullPath: string
  hasI18n: boolean
  locales: string[]
  children: TreeNode[]
}

interface TranslationTreeProps {
  nodes: TreeNode[]
  onSelectScope: (path: string) => void
  selectedScope: string | null
}

function kebabToTitle(kebab: string): string {
  return kebab
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const TreeNodeComponent: React.FC<{
  node: TreeNode
  level: number
  onSelect: (path: string) => void
  selectedPath: string | null
}> = ({ node, level, onSelect, selectedPath }) => {
  const hasChildren = node.children.length > 0
  const isSelected = selectedPath === node.fullPath

  return (
    <div className="gba:w-full">
      <Button
        variant={isSelected ? 'default' : 'ghost'}
        className="gba:w-full gba:justify-start gba:h-auto gba:py-1.5 gba:px-2 gba:text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (node.hasI18n) {
            onSelect(node.fullPath)
          }
        }}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
          <div className="gba:flex gba:flex-col gba:items-start gba:gap-0.5 gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
              <span className="gba:font-medium gba:truncate">{node.name}</span>
              {/* File icon AFTER name for scopes with translations */}
              {node.hasI18n && (
                <File size={16} weight="regular" className="gba:text-muted-foreground gba:flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </Button>

      {/* Always render children (no expand/collapse) */}
      {hasChildren && (
        <div className="gba:w-full">
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.fullPath}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const TranslationTree: React.FC<TranslationTreeProps> = ({ nodes, onSelectScope, selectedScope }) => {
  return (
    <Card className="gba:w-full">
      <CardHeader>
        <CardTitle>Translation Scopes</CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div className="gba:w-full gba:max-h-[600px] gba:overflow-y-auto">
          {nodes.map(node => (
            <TreeNodeComponent
              key={node.fullPath}
              node={node}
              level={0}
              onSelect={onSelectScope}
              selectedPath={selectedScope}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to build tree from flat scope list (hide 'src' level)
export function buildTree(scopes: Array<{ path: string; hasI18n: boolean; locales: string[] }>): TreeNode[] {
  if (scopes.length === 0) return []

  const map = new Map<string, TreeNode>()
  const scopeMap = new Map<string, { hasI18n: boolean; locales: string[] }>()

  // Store all scopes with their i18n info
  for (const scope of scopes) {
    scopeMap.set(scope.path, { hasI18n: scope.hasI18n, locales: scope.locales })
  }

  // Create ALL nodes (including all parent directories), but skip 'src'
  for (const scope of scopes) {
    const parts = scope.path.split('/').filter(p => p && p !== 'src') // FILTER OUT 'src'

    // Create nodes for EVERY segment in the path
    for (let i = 0; i < parts.length; i++) {
      const pathSegments = parts.slice(0, i + 1)
      const fullPath = pathSegments.join('/')

      if (!map.has(fullPath)) {
        const scopeInfo = scopeMap.get(fullPath) || scopeMap.get('src/' + fullPath) // Check both paths
        map.set(fullPath, {
          name: kebabToTitle(pathSegments[pathSegments.length - 1]),
          fullPath: 'src/' + fullPath, // Restore 'src/' prefix for actual path
          hasI18n: scopeInfo?.hasI18n || false,
          locales: scopeInfo?.locales || [],
          children: []
        })
      }
    }
  }

  // Build parent-child relationships
  for (const [path, node] of map.entries()) {
    const parts = path.split('/').filter(p => p)

    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = map.get(parentPath)
      if (parent && !parent.children.find(c => c.fullPath === node.fullPath)) {
        parent.children.push(node)
      }
    }
  }

  // Get root nodes (top-level directories after removing 'src')
  const root: TreeNode[] = []
  for (const [path, node] of map.entries()) {
    const parts = path.split('/').filter(p => p)
    if (parts.length === 1) {
      root.push(node)
    }
  }

  // Sort recursively
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach(node => sortChildren(node.children))
  }
  sortChildren(root)

  return root
}
