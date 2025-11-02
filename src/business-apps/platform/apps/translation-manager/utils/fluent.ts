import * as F from '@fluent/syntax'

export type FileMeta = {
  status?: 'proposed' | 'approved' | 'deprecated'
  updatedBy?: string
  updatedAt?: string
  notes?: string
  // NEW: Review metadata
  reviewedAt?: string
  reviewedBy?: string
  reviewedKeys?: string[] // List of key IDs that have been reviewed
}

export function parseFTL(raw: string): F.Resource {
  return F.parse(raw, { withSpans: false })
}
export function serializeFTL(ast: F.Resource): string {
  return F.serialize(ast, { withJunk: false })
}

export function getFileMeta(ast: F.Resource): FileMeta | undefined {
  // Top-level comment starting with "file-meta:"
  const first = ast.body[0] as any
  const comment = first?.type === 'Comment' ? first : null
  const content = comment?.content?.trim() || ''
  const m = /^file-meta:\s*(\{[\s\S]*\})$/.exec(content)
  if (!m) return undefined
  try {
    return JSON.parse(m[1])
  } catch {
    return undefined
  }
}
export function setFileMeta(ast: F.Resource, meta: FileMeta) {
  const comment = { type: 'Comment', content: `file-meta: ${JSON.stringify(meta)}` } as any
  const first = ast.body[0] as any
  if (first?.type === 'Comment') ast.body[0] = comment
  else ast.body.unshift(comment)
}

export function listMessageIds(ast: F.Resource): string[] {
  const ids: string[] = []

  ast.body.forEach((e: any) => {
    if (e.type !== 'Message') return

    const msgId = e.id.name
    const value = e.value

    // Check if this is a SelectExpression (plural/selector)
    if (value?.elements?.length === 1 && value.elements[0].type === 'Placeable') {
      const expr = value.elements[0].expression

      if (expr.type === 'SelectExpression') {
        // Recursively extract all variant paths
        const extractVariantPaths = (selector: any, prefix: string = msgId): string[] => {
          const paths: string[] = []

          selector.variants.forEach((v: any) => {
            const variantKey = v.key.name || v.key.value
            const currentPath = `${prefix}[${variantKey}]`

            // Check if this variant contains a nested selector
            const vValue = v.value
            const hasNestedSelector = vValue?.elements?.some(
              (el: any) => el.type === 'Placeable' && el.expression?.type === 'SelectExpression'
            )

            if (hasNestedSelector) {
              // Find the nested selector and recurse
              const nestedExpr = vValue.elements.find(
                (el: any) => el.type === 'Placeable' && el.expression?.type === 'SelectExpression'
              )?.expression

              if (nestedExpr) {
                // Recursively extract paths from nested selector
                const nestedPaths = extractVariantPaths(nestedExpr, currentPath)
                paths.push(...nestedPaths)
              }
            } else {
              // Leaf variant - add as final path
              paths.push(currentPath)
            }
          })

          return paths
        }

        const variantPaths = extractVariantPaths(expr)
        ids.push(...variantPaths)
        return
      }
    }

    // Regular message (main value)
    ids.push(msgId)

    // Add attributes as separate keys: "id.attribute"
    if (e.attributes) {
      e.attributes.forEach((attr: any) => {
        ids.push(`${msgId}.${attr.id.name}`)
      })
    }
  })

  return ids
}
export function getMessage(ast: F.Resource, id: string): F.Message | null {
  const msg = ast.body.find((e: any) => e.type === 'Message' && e.id.name === id)
  return (msg as F.Message) || null
}

// Get the Fluent AST Pattern for a message
export function getMessagePattern(ast: F.Resource, id: string): any | null {
  // Check if this is an attribute: "id.attribute"
  const attrMatch = id.match(/^(.+)\.(.+)$/)
  if (attrMatch) {
    const [, msgId, attrName] = attrMatch
    const msg = getMessage(ast, msgId)
    if (!msg || !msg.attributes) return null

    const attr = msg.attributes.find((a: any) => a.id.name === attrName)
    if (!attr || !attr.value) return null

    return attr.value
  }

  // Check if this is a variant key: "id[variant]" or nested "id[variant1][variant2]"
  const variantMatch = id.match(/^([^[]+)(\[.+\])$/)

  if (variantMatch) {
    const [, msgId, variantPath] = variantMatch
    const msg = getMessage(ast, msgId)
    if (!msg || !msg.value) return null

    // Extract all variant keys from the path
    const variantKeys = variantPath.match(/\[([^\]]+)\]/g)?.map(k => k.slice(1, -1)) || []

    // Navigate through nested selectors to find the target variant
    const findVariant = (expr: any, keys: string[]): any => {
      if (!expr || expr.type !== 'SelectExpression') return null
      if (keys.length === 0) return null

      const [currentKey, ...remainingKeys] = keys
      const variant = expr.variants.find((v: any) => (v.key.name || v.key.value) === currentKey)

      if (!variant) return null

      // If no more keys, return this variant's value
      if (remainingKeys.length === 0) {
        return variant.value
      }

      // Otherwise, look for nested selector in this variant
      const vValue = variant.value
      const nestedExpr = vValue?.elements?.find(
        (el: any) => el.type === 'Placeable' && el.expression?.type === 'SelectExpression'
      )?.expression

      if (nestedExpr) {
        return findVariant(nestedExpr, remainingKeys)
      }

      return null
    }

    // Start navigation from the root selector
    const value = msg.value as any
    if (value.elements?.length === 1 && value.elements[0].type === 'Placeable') {
      const expr = value.elements[0].expression

      if (expr.type === 'SelectExpression') {
        return findVariant(expr, variantKeys)
      }
    }

    return null
  }

  // Regular message
  const msg = getMessage(ast, id)
  if (!msg || !msg.value) return null

  return msg.value
}

// Update a message pattern from a Fluent AST Pattern
export function setMessagePattern(ast: F.Resource, id: string, pattern: any) {
  // Check if this is an attribute: "id.attribute"
  const attrMatch = id.match(/^(.+)\.(.+)$/)
  if (attrMatch) {
    const [, msgId, attrName] = attrMatch
    let msg = getMessage(ast, msgId)

    // Create message if it doesn't exist
    if (!msg) {
      const tmpSrc = `${msgId} = placeholder\n`
      const tmpAst = F.parse(tmpSrc, { withSpans: false })
      msg = tmpAst.body.find((e: any) => e.type === 'Message') as F.Message
      ;(ast.body as any).push(msg)
    }

    // Ensure attributes array exists
    if (!msg.attributes) {
      ;(msg as any).attributes = []
    }

    // Find or create attribute
    const attr = msg.attributes.find((a: any) => a.id.name === attrName)
    if (attr) {
      attr.value = pattern
    } else {
      ;(msg.attributes as any).push({
        type: 'Attribute',
        id: { type: 'Identifier', name: attrName },
        value: pattern
      })
    }
    return
  }

  // Check if this is a variant: "id[variant]" or nested "id[variant1][variant2]"
  const variantMatch = id.match(/^([^[]+)(\[.+\])$/)
  if (variantMatch) {
    const [, msgId, variantPath] = variantMatch
    const msg = getMessage(ast, msgId)

    if (!msg || !msg.value) return

    // Extract all variant keys
    const variantKeys = variantPath.match(/\[([^\]]+)\]/g)?.map(k => k.slice(1, -1)) || []

    // Navigate and update nested variant
    const updateVariant = (expr: any, keys: string[]): boolean => {
      if (!expr || expr.type !== 'SelectExpression') return false
      if (keys.length === 0) return false

      const [currentKey, ...remainingKeys] = keys
      const variant = expr.variants.find((v: any) => (v.key.name || v.key.value) === currentKey)

      if (!variant) return false

      // If this is the final key, update the variant value
      if (remainingKeys.length === 0) {
        variant.value = pattern
        return true
      }

      // Otherwise, find nested selector and recurse
      const vValue = variant.value
      const nestedExpr = vValue?.elements?.find(
        (el: any) => el.type === 'Placeable' && el.expression?.type === 'SelectExpression'
      )?.expression

      if (nestedExpr) {
        return updateVariant(nestedExpr, remainingKeys)
      }

      return false
    }

    const value = msg.value as any
    if (value.elements?.length === 1 && value.elements[0].type === 'Placeable') {
      const expr = value.elements[0].expression

      if (expr.type === 'SelectExpression') {
        updateVariant(expr, variantKeys)
      }
    }
    return
  }

  // Regular message
  const existing = getMessage(ast, id)
  if (existing) {
    existing.value = pattern
  } else {
    // Create new message
    ;(ast.body as any).push({
      type: 'Message',
      id: { type: 'Identifier', name: id },
      value: pattern,
      attributes: []
    })
  }
}

export function removeMessage(ast: F.Resource, id: string) {
  const idx = (ast.body as any).findIndex((e: any) => e.type === 'Message' && e.id.name === id)
  if (idx >= 0) (ast.body as any).splice(idx, 1)
}

export function collectMessages(ast: F.Resource): Record<string, string> {
  const out: Record<string, string> = {}
  for (const node of ast.body as any[]) {
    if (node.type === 'Message' && node.value) {
      out[node.id.name] = F.serializeExpression(node.value).trim()
    }
  }
  return out
}
