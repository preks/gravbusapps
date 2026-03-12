import { useCallback, useState } from 'react'

const useBackofficeTabSearch = () => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search ?? '')
  }, [])

  return { searchTerm, handleSearchChange }
}

export default useBackofficeTabSearch
