function collapseWhitespaceLinear(input: string): string {
  let result = ''
  let previousWasWhitespace = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const isWhitespace = /\s/.test(char)

    if (isWhitespace) {
      if (!previousWasWhitespace) {
        result += ' '
        previousWasWhitespace = true
      }
      continue
    }

    result += char
    previousWasWhitespace = false
  }

  return result.trim()
}

export function isEffectivelyEmptyDocumentHtml(html: string): boolean {
  if (!html.trim()) return true

  try {
    if (typeof globalThis.DOMParser !== 'undefined') {
      const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
      if (doc.body.querySelector('table, img, video, audio, iframe, canvas, svg, hr, ul[data-type="taskList"]')) {
        return false
      }

      const text = collapseWhitespaceLinear((doc.body.textContent || '').split('\u200B').join(''))
      return text.length === 0
    }
  } catch {
    // Fall back to a lightweight string-based check below.
  }

  return (
    collapseWhitespaceLinear(
      html
        .replace(/<[^>]*>/g, '')
        .split('\u200B')
        .join('')
    ).length === 0
  )
}
