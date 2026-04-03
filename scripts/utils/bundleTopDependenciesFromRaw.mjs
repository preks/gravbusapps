/**
 * Shared logic: rollup-plugin-visualizer raw-data JSON → top buckets/assets + chunk size.
 */
import fs from 'node:fs'
import path from 'node:path'

export const TOP_COMBINED_DEFAULT = 20

/** Map a visualizer module path to an aggregation bucket (npm package name or src/other). */
export function bucketForPath(fullPath) {
  const norm = fullPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const nm = 'node_modules/'
  const i = norm.indexOf(nm)
  if (i !== -1) {
    const rest = norm.slice(i + nm.length)
    if (rest.startsWith('@')) {
      const parts = rest.split('/')
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
      return parts[0]
    }
    return rest.split('/')[0] || '(node_modules)'
  }
  if (norm.includes('/src/') || norm.startsWith('src/')) {
    const s = norm.includes('/src/') ? norm.split('/src/')[1] : norm.slice(4)
    const seg = s.split('/').filter(Boolean)
    if (seg.length >= 2) return `(src)/${seg[0]}/${seg[1]}`
    if (seg.length === 1) return `(src)/${seg[0]}`
    return '(src)'
  }
  const head = norm.split('/').filter(Boolean)[0] || '(root)'
  return `(other)/${head}`
}

export function collectLeaves(node, pathParts, out) {
  if (Object.prototype.hasOwnProperty.call(node, 'uid') && node.uid != null) {
    const rel = [...pathParts, node.name].filter(Boolean).join('/')
    out.push({ rel, uid: node.uid })
    return
  }
  const next = node.name && node.name !== 'root' ? [...pathParts, node.name] : [...pathParts]
  if (Array.isArray(node.children)) {
    for (const c of node.children) collectLeaves(c, next, out)
  }
}

export function aggregateByPackage(raw) {
  const { tree, nodeParts } = raw
  const leaves = []
  collectLeaves(tree, [], leaves)
  const totals = new Map()
  for (const { rel, uid } of leaves) {
    const part = nodeParts[uid]
    if (!part) continue
    const r = part.renderedLength ?? 0
    const g = part.gzipLength ?? 0
    const key = bucketForPath(rel)
    const cur = totals.get(key) || { rendered: 0, gzip: 0 }
    cur.rendered += r
    cur.gzip += g
    totals.set(key, cur)
  }
  return totals
}

/** File extensions Rollup typically emits as separate modules (images, fonts, media). */
export const ASSET_FILE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.avif',
  '.bmp',
  '.woff2',
  '.woff',
  '.ttf',
  '.otf',
  '.mp4',
  '.webm',
  '.mov',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a'
])

function assetExtFromLeafName(leafFileName) {
  const base = (leafFileName || '').split('?')[0]
  const lower = base.toLowerCase()
  const dot = lower.lastIndexOf('.')
  if (dot === -1) return null
  return lower.slice(dot)
}

function isBundledAssetLeaf(rel, leafFileName) {
  const ext = assetExtFromLeafName(leafFileName)
  return ext != null && ASSET_FILE_EXT.has(ext)
}

function leafFileNameFromRel(rel) {
  const norm = rel.replace(/\\/g, '/')
  const seg = norm.split('/').pop() || ''
  return seg
}

export function shortPathForLog(rel) {
  const n = rel.replace(/\\/g, '/')
  const i = n.indexOf('/src/')
  let s = i !== -1 ? n.slice(i + 5) : n.split('/').filter(Boolean).slice(-6).join('/')
  const max = 58
  if (s.length > max) s = `…${s.slice(-(max - 1))}`
  return s
}

export function listAllBundledAssets(raw) {
  const { tree, nodeParts } = raw
  const leaves = []
  collectLeaves(tree, [], leaves)
  const rows = []
  for (const { rel, uid } of leaves) {
    const leafName = leafFileNameFromRel(rel)
    if (!isBundledAssetLeaf(rel, leafName)) continue
    const part = nodeParts[uid]
    if (!part) continue
    const r = part.renderedLength ?? 0
    const g = part.gzipLength ?? 0
    rows.push({
      kind: 'asset',
      name: shortPathForLog(rel),
      rendered: r,
      gzip: g
    })
  }
  return rows
}

/** Package/source buckets + individual bundled assets, sorted by rendered, one list. */
export function topCombinedBucketsAndAssets(raw, n = TOP_COMBINED_DEFAULT) {
  const totals = aggregateByPackage(raw)
  const bucketRows = [...totals.entries()].map(([name, v]) => ({
    kind: 'bucket',
    name,
    rendered: v.rendered,
    gzip: v.gzip
  }))
  const assetRows = listAllBundledAssets(raw)
  return [...bucketRows, ...assetRows].sort((a, b) => b.rendered - a.rendered).slice(0, n)
}

export function getChunkJsBytes(projectRoot, entryKey) {
  const chunkJs = path.join(projectRoot, 'dist', entryKey, 'index.js')
  if (!fs.existsSync(chunkJs)) return 0
  return fs.statSync(chunkJs).size
}

/**
 * @param {object} params
 * @param {object} params.raw - visualizer raw-data JSON
 * @param {string} params.projectRoot
 * @param {string} params.entryKey
 * @param {number} [params.topN]
 * @param {number | null} [params.bitbucketBuildNumber]
 * @param {string | null} [params.pipelineUrl]
 * @param {number | null} [params.chunkJsBytes] - if set, skips reading dist (needed when merging after later builds overwrote dist)
 */
export function buildBundleEntryPayload({
  raw,
  projectRoot,
  entryKey,
  topN = TOP_COMBINED_DEFAULT,
  bitbucketBuildNumber = null,
  pipelineUrl = null,
  chunkJsBytes: chunkJsBytesOverride = null
}) {
  const top = topCombinedBucketsAndAssets(raw, topN)
  const chunkJsBytes =
    chunkJsBytesOverride != null ? chunkJsBytesOverride : getChunkJsBytes(projectRoot, entryKey)
  return {
    bitbucketBuildNumber,
    pipelineUrl,
    chunkJsBytes,
    top
  }
}
