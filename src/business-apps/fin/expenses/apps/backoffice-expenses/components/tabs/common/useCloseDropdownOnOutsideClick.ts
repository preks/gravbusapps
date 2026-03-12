import { useEffect } from 'react'

type UseCloseDropdownOnOutsideClickParams = {
  containerClassName: string
  onOutsideClick: () => void
}

const useCloseDropdownOnOutsideClick = ({
  containerClassName,
  onOutsideClick
}: UseCloseDropdownOnOutsideClickParams) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`.${containerClassName}`)) {
        onOutsideClick()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [containerClassName, onOutsideClick])
}

export default useCloseDropdownOnOutsideClick
