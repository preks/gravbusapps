/**
 * @jest-environment jsdom
 */
import { createContextMenuItem, isUniverSheetTabBarContextMenuTarget } from '../univerGridContextMenuDom'

describe('univerGridContextMenuDom', () => {
  describe('createContextMenuItem', () => {
    const createTemplate = () => {
      const template = document.createElement('button')
      template.className = 'univer-menu-item univer-justify-between'
      template.setAttribute('aria-haspopup', 'true')
      template.appendChild(document.createElement('span')).textContent = 'Old label'
      return template
    }

    it('rebuilds the menu item with a DOM-created default icon and click handler', () => {
      const onClick = jest.fn()
      const popup = document.createElement('div')
      popup.className = 'mock-univer-popup'
      popup.tabIndex = -1
      popup.addEventListener('keydown', event => {
        if ((event as KeyboardEvent).key === 'Escape') {
          popup.remove()
        }
      })
      document.body.appendChild(popup)

      const item = createContextMenuItem(
        createTemplate(),
        'data-univer-custom-comment-item',
        'univer-custom-comment-item',
        'Add comment',
        onClick
      )
      popup.appendChild(item)

      item.click()

      expect(item.getAttribute('data-univer-custom-comment-item')).toBe('true')
      expect(item.classList.contains('univer-custom-comment-item')).toBe(true)
      expect(item.querySelector('[aria-haspopup="true"]')).toBeNull()
      expect(item.textContent).toContain('Add comment')
      expect(item.querySelector('svg')).not.toBeNull()
      expect(item.querySelectorAll('path')).toHaveLength(1)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(document.body.querySelector('.mock-univer-popup')).toBeNull()
    })

    it('renders the requested trusted icon variant without HTML parsing', () => {
      const item = createContextMenuItem(
        createTemplate(),
        'data-univer-merge-item',
        'univer-merge-item',
        'Merge',
        jest.fn(),
        'merge'
      )

      expect(item.querySelector('svg')).not.toBeNull()
      expect(item.querySelectorAll('path')).toHaveLength(6)
      expect(item.querySelector('span')?.children[0]?.tagName.toLowerCase()).toBe('svg')
      expect(item.textContent).toContain('Merge')
    })
  })

  describe('isUniverSheetTabBarContextMenuTarget', () => {
    it('returns false for grid-like targets without sheet-bar markers', () => {
      const grid = document.createElement('div')
      grid.className = 'univer-canvas'
      document.body.appendChild(grid)
      expect(isUniverSheetTabBarContextMenuTarget(grid)).toBe(false)
      grid.remove()
    })

    it('returns true for slide-tab-bar and descendants', () => {
      const bar = document.createElement('div')
      bar.setAttribute('data-u-comp', 'slide-tab-bar')
      const tab = document.createElement('div')
      tab.setAttribute('data-u-comp', 'slide-tab-item')
      const label = document.createElement('span')
      label.textContent = 'Sheet1'
      tab.appendChild(label)
      bar.appendChild(tab)
      document.body.appendChild(bar)
      expect(isUniverSheetTabBarContextMenuTarget(bar)).toBe(true)
      expect(isUniverSheetTabBarContextMenuTarget(tab)).toBe(true)
      expect(isUniverSheetTabBarContextMenuTarget(label)).toBe(true)
      bar.remove()
    })

    it('returns true for sheet-bar-append-button', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-u-comp', 'sheet-bar-append-button')
      document.body.appendChild(btn)
      expect(isUniverSheetTabBarContextMenuTarget(btn)).toBe(true)
      btn.remove()
    })
  })
})
