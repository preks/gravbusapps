import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

let paginationChainIdCounter = 0
let paginationSplitIdCounter = 0

function readPaginationAttribute(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function createPaginationChainId() {
  paginationChainIdCounter += 1
  return `pagination-chain-${paginationChainIdCounter}`
}

export function createPaginationSplitId() {
  paginationSplitIdCounter += 1
  return `pagination-split-${paginationSplitIdCounter}`
}

export function getTablePaginationChainId(node: ProseMirrorNode) {
  return readPaginationAttribute(node.attrs.paginationChainId)
}

export function getTablePaginationSplitId(node: ProseMirrorNode) {
  return readPaginationAttribute(node.attrs.paginationSplitId)
}

export function getTableRuntimeChainKey(node: ProseMirrorNode, tablePos: number) {
  return getTablePaginationChainId(node) ?? getTablePaginationSplitId(node) ?? `table:${tablePos}`
}
