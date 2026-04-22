/**
 * Lightweight HTML-to-Markdown converter for contentEditable output.
 * Handles the common elements produced by ReactMarkdown / GFM rendering
 * so that inline edits round-trip cleanly back to markdown.
 */

function processNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName
  const children = Array.from(el.childNodes).map(processNode).join('')

  switch (tag) {
    case 'H1':
      return `# ${children.trim()}\n\n`
    case 'H2':
      return `## ${children.trim()}\n\n`
    case 'H3':
      return `### ${children.trim()}\n\n`
    case 'H4':
      return `#### ${children.trim()}\n\n`
    case 'H5':
      return `##### ${children.trim()}\n\n`
    case 'H6':
      return `###### ${children.trim()}\n\n`

    case 'P':
      return `${children.trim()}\n\n`

    case 'STRONG':
    case 'B':
      return `**${children}**`

    case 'EM':
    case 'I':
      return `*${children}*`

    case 'DEL':
    case 'S':
      return `~~${children}~~`

    case 'CODE':
      if (el.parentElement?.tagName === 'PRE') return children
      return `\`${children}\``

    case 'PRE': {
      const codeEl = el.querySelector('code')
      const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || ''
      const code = codeEl?.textContent || children
      return `\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`
    }

    case 'A': {
      const href = el.getAttribute('href') || ''
      return `[${children}](${href})`
    }

    case 'BR':
      return '\n'

    case 'HR':
      return '---\n\n'

    case 'BLOCKQUOTE':
      return (
        children
          .trim()
          .split('\n')
          .map(line => `> ${line}`)
          .join('\n') + '\n\n'
      )

    case 'UL':
      return `${children}\n`

    case 'OL':
      return `${children}\n`

    case 'LI': {
      const parent = el.parentElement
      if (parent?.tagName === 'OL') {
        const index = Array.from(parent.children).indexOf(el) + 1
        return `${index}. ${children.trim()}\n`
      }
      return `- ${children.trim()}\n`
    }

    case 'TABLE':
      return `${children}\n`

    case 'THEAD':
    case 'TBODY':
      return children

    case 'TR': {
      const cells = Array.from(el.children).map(cell => processNode(cell).trim())
      const row = `| ${cells.join(' | ')} |`

      if (el.parentElement?.tagName === 'THEAD') {
        const separator = `| ${cells.map(() => '---').join(' | ')} |`
        return `${row}\n${separator}\n`
      }
      return `${row}\n`
    }

    case 'TH':
    case 'TD':
      return children.trim()

    case 'IMG': {
      const alt = el.getAttribute('alt') || ''
      const src = el.getAttribute('src') || ''
      return `![${alt}](${src})`
    }

    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
      return children

    default:
      return children
  }
}

export function htmlToMarkdown(element: HTMLElement): string {
  const raw = Array.from(element.childNodes).map(processNode).join('')
  return raw.replace(/\n{3,}/g, '\n\n').trim()
}
