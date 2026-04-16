import { headerFooterSidebarPreventBlur } from '../headerFooterSidebarPreventBlur'

describe('headerFooterSidebarPreventBlur', () => {
  it('preserves default focus behavior for input-like targets', () => {
    const input = document.createElement('input')
    const preventDefault = jest.fn()

    headerFooterSidebarPreventBlur({
      target: input,
      preventDefault
    } as unknown as React.MouseEvent<HTMLElement>)

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('still prevents blur for non-input sidebar controls', () => {
    const button = document.createElement('button')
    const preventDefault = jest.fn()

    headerFooterSidebarPreventBlur({
      target: button,
      preventDefault
    } as unknown as React.MouseEvent<HTMLElement>)

    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
