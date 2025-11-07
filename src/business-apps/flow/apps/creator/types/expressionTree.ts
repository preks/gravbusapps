/**
 * Expression Tree Types
 *
 * Type definitions for the tree-based expression builder
 */

import { ReactNode } from 'react'

export type NodeType = 'root' | 'category' | 'object' | 'array' | 'field'
export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object' | 'array'

export interface TreeNode {
  id: string
  label: string
  icon?: ReactNode
  path: string[] // Path segments to build expression
  type: NodeType
  fieldType?: FieldType
  example?: string // Example value for preview
  description?: string // Tooltip description
  children?: TreeNode[]
  isExpandedByDefault?: boolean
}

export interface ExpressionBuilderMode {
  mode: 'tree' | 'text'
}

export interface QuickAction {
  id: string
  label: string
  expression: string
  description: string
  icon?: ReactNode
  category: 'common' | 'suggestion' | 'recent'
}

export interface FieldSuggestion {
  name: string
  label: string
  expression: string
  type: FieldType
  stepIndex: number
  stepTitle: string
}
