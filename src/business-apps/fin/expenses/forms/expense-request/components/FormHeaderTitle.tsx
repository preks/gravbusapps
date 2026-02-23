import React from 'react'

/** Shared styles so title appearance is defined in one place (DRY) and stable from first paint (no late CSS). */
const HEADER_TITLE_WRAPPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none'
}

const HEADER_TITLE_H4_STYLE: React.CSSProperties = {
  margin: 0,
  textAlign: 'center',
  fontFamily: "'Roboto', sans-serif",
  pointerEvents: 'auto',
  fontSize: '1.25rem',
  fontWeight: 600,
  lineHeight: 1.35
}

export interface FormHeaderTitleProps {
  title: string
  titleContainerTestId: string
  headerTitleTestId: string
}

/**
 * Memoized header title with native h4 + inline styles.
 * Does not re-render when parent context updates and does not depend on Ant Design/theme CSS,
 * which avoids title flicker on initial load (Option B: isolate header from context re-renders).
 * Shared by ExpensePlan and ExpenseRequest (DRY).
 *
 * For the start step, callers should pass a stable title (e.g. from useMemo with [] deps) so
 * the memo skips re-renders when context updates. If your app supports locale switching, consider
 * useMemo(..., [locale]) so the title updates when language changes.
 */
const FormHeaderTitle = React.memo(function FormHeaderTitle({
  title,
  titleContainerTestId,
  headerTitleTestId
}: FormHeaderTitleProps) {
  return (
    <div className="gba:flex-1" style={HEADER_TITLE_WRAPPER_STYLE} data-testid={titleContainerTestId}>
      <h4 style={HEADER_TITLE_H4_STYLE} data-testid={headerTitleTestId}>
        {title}
      </h4>
    </div>
  )
})

export default FormHeaderTitle
