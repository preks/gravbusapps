import type { ExpressionSuggestionItem, ExpressionSourceType } from '@/common/components/flow/expression-editor'

export type TreeNode = {
  id: string
  label: string
  children?: TreeNode[]
  item?: ExpressionSuggestionItem
}

export const SOURCE_ORDER: ExpressionSourceType[] = ['trigger', 'workflow', 'steps', 'catalog', 'entity', 'orgchart']

export const SOURCE_LABEL: Record<ExpressionSourceType, string> = {
  trigger: 'Trigger',
  workflow: 'Workflow',
  steps: 'Steps',
  catalog: 'Catalog',
  entity: 'Entity',
  orgchart: 'Org Chart'
}

const cleanLabelForLeaf = (item: ExpressionSuggestionItem): string => {
  if (item.source === 'trigger') {
    const s = String(item.label || '').trim()
    return s.replace(/^trigger\s*[-—:]\s*/i, '') || s
  }
  if (item.source === 'steps') {
    const s = String(item.label || '').trim()
    const parts = s.split(' - ')
    if (parts.length >= 2) return parts.slice(1).join(' - ').trim() || s
    return s
  }
  return String(item.label || '').trim()
}

const buildStepRefToLabel = (items: ExpressionSuggestionItem[]): Map<string, string> => {
  const map = new Map<string, string>()
  for (const it of items) {
    if (it.source !== 'steps') continue
    const expr = String(it.expression || '').trim()
    const parts = expr.startsWith('$') ? expr.slice(1).split('.') : expr.split('.')
    if (parts[0] !== 'steps') continue
    const ref = String(parts[1] || '').trim()
    if (!ref) continue
    const label = String(it.label || '').trim()
    const stepLabel = label.includes(' - ') ? label.split(' - ')[0].trim() : ''
    if (stepLabel && !map.has(ref)) map.set(ref, stepLabel)
  }
  return map
}

const expressionToSegments = (item: ExpressionSuggestionItem): string[] => {
  const expr = String(item.expression || '').trim()
  if (!expr) return []
  const raw = expr.startsWith('$') ? expr.slice(1) : expr
  const parts = raw
    .split('.')
    .map(p => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return []

  // Drop the source root (e.g. workflow/steps/catalog) since we already group by it.
  const [, ...rest0] = parts
  const rest = [...rest0]

  // Make tree navigation less technical: remove boilerplate segments where possible.
  if (item.source === 'trigger') {
    if (rest[0] === 'input') rest.shift()
    if (rest[0] && ['formData', 'inputData', 'inputValues'].includes(rest[0])) rest.shift()
    return ['Form fields', ...rest]
  }

  if (item.source === 'steps') {
    if (rest[1] && ['formData', 'resultData'].includes(rest[1])) {
      return [rest[0], ...rest.slice(2)]
    }
    return rest
  }

  if (item.source === 'workflow') {
    // Group workflow metadata into a single section so the top-level isn't a flat list.
    if (rest[0] && rest[0] !== 'initiator') return ['Metadata', ...rest]
    return rest
  }

  // Data sources are typically browsed as a flat list.
  if (item.source === 'catalog' || item.source === 'entity' || item.source === 'orgchart') {
    return []
  }

  return rest
}

const insertIntoTree = (root: TreeNode, path: string[], leaf: TreeNode) => {
  let cur = root
  cur.children = cur.children ?? []
  for (const seg of path) {
    const id = `${cur.id}/${seg}`
    let next = cur.children.find(c => c.id === id)
    if (!next) {
      next = { id, label: seg, children: [] }
      cur.children.push(next)
    }
    cur = next
    cur.children = cur.children ?? []
  }
  cur.children = cur.children ?? []
  cur.children.push(leaf)
}

const sortTree = (node: TreeNode) => {
  if (!node.children) return
  node.children.sort((a, b) => {
    const aIsLeaf = Boolean(a.item)
    const bIsLeaf = Boolean(b.item)
    if (aIsLeaf !== bIsLeaf) return aIsLeaf ? 1 : -1
    return a.label.localeCompare(b.label)
  })
  for (const c of node.children) sortTree(c)
}

export const filterTree = (node: TreeNode, q: string): TreeNode | null => {
  const query = q.trim().toLowerCase()
  if (!query) return node

  const label = node.label.toLowerCase()
  const matchesSelf = label.includes(query)
  const matchesLeaf =
    node.item &&
    (String(node.item.label || '')
      .toLowerCase()
      .includes(query) ||
      String(node.item.description || '')
        .toLowerCase()
        .includes(query) ||
      String(node.item.expression || '')
        .toLowerCase()
        .includes(query))

  const children = (node.children ?? []).map(c => filterTree(c, query)).filter(Boolean) as TreeNode[]

  if (matchesSelf || matchesLeaf || children.length > 0) return { ...node, children }
  return null
}

export const buildFlowContextTree = (items: ExpressionSuggestionItem[]): TreeNode[] => {
  const stepRefToLabel = buildStepRefToLabel(items)
  const roots: TreeNode[] = SOURCE_ORDER.map(source => ({
    id: `root/${source}`,
    label: SOURCE_LABEL[source],
    children: []
  }))

  const rootBySource = new Map<ExpressionSourceType, TreeNode>()
  SOURCE_ORDER.forEach((s, idx) => rootBySource.set(s, roots[idx]))

  for (const it of items) {
    const root = rootBySource.get(it.source)
    if (!root) continue

    const segs = expressionToSegments(it)
    const path = [...segs]

    if (it.source === 'steps' && path[0]) {
      const ref = path[0]
      const stepLabel = stepRefToLabel.get(ref)
      path[0] = stepLabel ? `${stepLabel} (${ref})` : ref
    }

    const leaf: TreeNode = {
      id: `leaf/${it.source}/${it.id}`,
      label: cleanLabelForLeaf(it) || String(it.expression || '').trim() || it.id,
      item: it
    }
    insertIntoTree(root, path.slice(0, Math.max(0, path.length - 1)), leaf)
  }

  for (const r of roots) sortTree(r)
  return roots
}
