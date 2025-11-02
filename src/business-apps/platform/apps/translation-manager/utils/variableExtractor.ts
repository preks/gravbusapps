import * as F from '@fluent/syntax'

// Extract all variable names used in a message pattern
export function extractVariablesFromPattern(pattern: any): string[] {
  const variables = new Set<string>()

  if (!pattern || !pattern.elements) return []

  const traverse = (node: any) => {
    if (!node) return

    if (node.type === 'VariableReference') {
      variables.add(node.id.name)
    } else if (node.type === 'FunctionReference') {
      // Extract variables from function arguments
      if (node.arguments?.positional) {
        node.arguments.positional.forEach((arg: any) => traverse(arg))
      }
      if (node.arguments?.named) {
        node.arguments.named.forEach((arg: any) => traverse(arg.value))
      }
    } else if (node.type === 'SelectExpression') {
      // Traverse selector
      traverse(node.selector)
      // Traverse variants
      if (node.variants) {
        node.variants.forEach((variant: any) => traverse(variant.value))
      }
    } else if (node.type === 'Pattern' && node.elements) {
      node.elements.forEach((el: any) => {
        if (el.type === 'Placeable') {
          traverse(el.expression)
        }
      })
    } else if (node.type === 'Placeable') {
      traverse(node.expression)
    }
  }

  traverse(pattern)

  return Array.from(variables).sort()
}

// Extract all variables from a message (including from all variants and attributes)
export function extractVariablesFromMessage(ast: F.Resource, messageId: string): string[] {
  const variables = new Set<string>()

  const msg = ast.body.find((e: any) => e.type === 'Message' && e.id.name === messageId) as F.Message | undefined
  if (!msg) return []

  // Extract from main value
  if (msg.value) {
    extractVariablesFromPattern(msg.value).forEach(v => variables.add(v))
  }

  // Extract from attributes
  if (msg.attributes) {
    msg.attributes.forEach((attr: any) => {
      if (attr.value) {
        extractVariablesFromPattern(attr.value).forEach(v => variables.add(v))
      }
    })
  }

  return Array.from(variables).sort()
}
