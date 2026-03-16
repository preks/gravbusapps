import React from 'react'

type ActionHandler = () => void

const withStoppedPropagation = (handler: ActionHandler) => (e?: React.MouseEvent) => {
  e?.stopPropagation()
  handler()
}

export default withStoppedPropagation
