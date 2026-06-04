const A1_OR_RANGE_REFERENCE_REGEX = /^[A-Z]+\d+(?::[A-Z]+\d+)?$/i

function commitNameBoxNavigation(input: HTMLInputElement) {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }))
}

function scheduleNameBoxNavigationCommit(input: HTMLInputElement) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => {
      commitNameBoxNavigation(input)
    })
    return
  }

  globalThis.setTimeout(() => {
    commitNameBoxNavigation(input)
  }, 0)
}

function isInputVisible(input: HTMLInputElement): boolean {
  const rect = input.getBoundingClientRect()
  const style = globalThis.getComputedStyle(input)
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
}

function findNameBoxInput(doc: Document): HTMLInputElement | null {
  const inputs = Array.from(doc.querySelectorAll('input')).filter((input): input is HTMLInputElement => {
    return input instanceof HTMLInputElement && isInputVisible(input)
  })

  return (
    inputs.find(input => {
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase()
      return ariaLabel.includes('name')
    }) ??
    inputs.find(input => {
      return A1_OR_RANGE_REFERENCE_REGEX.test(input.value.trim())
    }) ??
    null
  )
}

export function navigateUniverViaNameBox(cellReference: string, doc: Document): boolean {
  const normalizedReference = cellReference.trim().toUpperCase()
  if (!normalizedReference) {
    return false
  }

  const input = findNameBoxInput(doc)
  if (!input) {
    return false
  }

  const setValue = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
  input.focus({ preventScroll: true })

  if (setValue) {
    setValue.call(input, normalizedReference)
  } else {
    input.value = normalizedReference
  }

  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  scheduleNameBoxNavigationCommit(input)

  return true
}
