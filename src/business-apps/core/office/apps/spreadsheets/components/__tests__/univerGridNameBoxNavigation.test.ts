import { navigateUniverViaNameBox } from '../univerGridNameBoxNavigation'

describe('navigateUniverViaNameBox', () => {
  it('updates the visible A1 name box and defers enter-driven events until the next frame', () => {
    const input = document.createElement('input')
    input.value = 'A1'
    input.setAttribute('aria-label', 'Name box')
    input.focus = jest.fn()
    const requestAnimationFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })
    Object.defineProperty(input, 'getBoundingClientRect', {
      value: () => ({ width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20 })
    })

    const inputListener = jest.fn()
    const changeListener = jest.fn()
    const keydownListener = jest.fn()
    const keyupListener = jest.fn()
    input.addEventListener('input', inputListener)
    input.addEventListener('change', changeListener)
    input.addEventListener('keydown', keydownListener)
    input.addEventListener('keyup', keyupListener)
    document.body.appendChild(input)

    try {
      expect(navigateUniverViaNameBox('c5:d9', document)).toBe(true)
      expect(input.value).toBe('C5:D9')
      expect(input.focus).toHaveBeenCalledWith({ preventScroll: true })
      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1)
      expect(inputListener).toHaveBeenCalledTimes(1)
      expect(changeListener).toHaveBeenCalledTimes(1)
      expect(keydownListener).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }))
      expect(keyupListener).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }))
    } finally {
      requestAnimationFrameSpy.mockRestore()
      input.remove()
    }
  })
})
