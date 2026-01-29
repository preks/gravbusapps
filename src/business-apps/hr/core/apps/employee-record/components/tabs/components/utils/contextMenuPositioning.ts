/**
 * Utility function to calculate context menu position based on cursor position and screen boundaries
 * @param clientX - Mouse event clientX coordinate
 * @param clientY - Mouse event clientY coordinate
 * @param menuWidth - Width of the context menu in pixels
 * @param menuHeight - Height of the context menu in pixels
 * @param margin - Margin from screen edges in pixels
 * @returns Object with x and y coordinates for the menu position
 */
export const calculateContextMenuPosition = (
  clientX: number,
  clientY: number,
  menuWidth: number,
  menuHeight: number,
  margin: number = 10
): { x: number; y: number } => {
  // Determine horizontal position - open to the left by default, adjust for borders
  const spaceRight = window.innerWidth - clientX
  const spaceLeft = clientX

  let menuX: number
  // If near right border, open to the left of cursor
  if (spaceRight < menuWidth + margin) {
    menuX = clientX - menuWidth
  }
  // If near left border, open to the right of cursor
  else if (spaceLeft < menuWidth + margin) {
    menuX = clientX
  }
  // Default: open to the left of cursor
  else {
    menuX = clientX - menuWidth
  }

  // Ensure menu doesn't go off-screen horizontally
  if (menuX < 0) {
    menuX = margin
  }
  if (menuX + menuWidth > window.innerWidth) {
    menuX = window.innerWidth - menuWidth - margin
  }

  // Vertical position - adjust if menu would go off-screen at bottom
  let menuY = clientY
  const spaceBelow = window.innerHeight - clientY
  if (spaceBelow < menuHeight) {
    // Position above cursor if not enough space below
    menuY = clientY - menuHeight
    if (menuY < 0) {
      menuY = margin
    }
  }

  return { x: menuX, y: menuY }
}
