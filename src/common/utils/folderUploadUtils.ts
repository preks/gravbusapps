/**
 * Folder upload tree builder
 *
 * Converts a FileList produced by a `webkitdirectory` input into a
 * structured upload payload suitable for the future folder-upload API.
 *
 * The function is pure and has no side-effects — it only reads
 * `file.webkitRelativePath`, `file.size`, and `file.type`.
 */

export interface FolderTreeNode {
  clientId: string
  parentClientId: string | null
  /** true = folder node, false = file node */
  isFolder: boolean
  name: string
  /** Byte size — present on file nodes only */
  size?: number
  /** MIME type — present on file nodes only */
  mimeType?: string
}

/**
 * Entity IDs attached to the payload so the backend can link the uploaded
 * tree to the correct record.  Pass only the ID(s) that apply to the current
 * screen; omit (or pass `undefined`) for the others.
 */
export interface FolderUploadEntityIds {
  lead?: string
  note?: string
  account?: string
  contact?: string
  opportunity?: string
  investment?: string
  investmentCompany?: string
}

export interface FolderUploadPayload {
  uploadSessionId: string
  lead: string | null
  note: string | null
  account: string | null
  contact: string | null
  opportunity: string | null
  investment: string | null
  investmentCompany: string | null
  tree: FolderTreeNode[]
}

/**
 * Builds the folder-upload payload from a browser FileList.
 *
 * Algorithm:
 *   1. Iterate every File in the list (each carries `webkitRelativePath`).
 *   2. Walk the path segments top-down, upserting a folder node for each
 *      directory level that has not been seen yet.
 *   3. Append a file node for the leaf, pointing to its immediate parent folder.
 *
 * Folder nodes are de-duplicated by their full relative path, so sibling
 * files inside the same directory share one parent node — no duplicates.
 */
export function buildFolderTree(files: FileList, entityIds: FolderUploadEntityIds = {}): FolderUploadPayload {
  const uploadSessionId = crypto.randomUUID()
  const nodes: FolderTreeNode[] = []

  // Maps folderPath (e.g. "docs/invoices") → its clientId in the tree
  const folderClientIds = new Map<string, string>()

  let counter = 0
  const nextId = () => `c${++counter}`

  for (const file of Array.from(files)) {
    // webkitRelativePath is set only when webkitdirectory is active (e.g. "documents/invoices/jan.pdf").
    // For individually-selected files it is "" — fall back to the file name so the
    // file appears at root level with the correct name.
    const parts = (file.webkitRelativePath || file.name).split('/')

    // Walk every folder segment (everything except the last part = file name)
    let parentClientId: string | null = null

    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/')

      if (!folderClientIds.has(folderPath)) {
        const clientId = nextId()
        folderClientIds.set(folderPath, clientId)
        nodes.push({
          clientId,
          parentClientId,
          isFolder: true,
          name: parts[i]
        })
      }

      parentClientId = folderClientIds.get(folderPath)!
    }

    // Leaf: the actual file
    nodes.push({
      clientId: nextId(),
      parentClientId,
      isFolder: false,
      name: parts[parts.length - 1],
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    })
  }

  return {
    uploadSessionId,
    lead: entityIds.lead ?? null,
    note: entityIds.note ?? null,
    account: entityIds.account ?? null,
    contact: entityIds.contact ?? null,
    opportunity: entityIds.opportunity ?? null,
    investment: entityIds.investment ?? null,
    investmentCompany: entityIds.investmentCompany ?? null,
    tree: nodes
  }
}
