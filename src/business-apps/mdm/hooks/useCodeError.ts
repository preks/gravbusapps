import { useState, useEffect } from 'react'

export const useCodeError = (usedCodes: string[] = []) => {
  const [codeError, setCodeError] = useState<string>('')

  // Reset code error when modal opens
  useEffect(() => {
    setCodeError('')
  }, [])

  const validateCode = (code: string) => {
    if (!code) {
      setCodeError('')
      return true
    }

    const isCodeUsed = usedCodes.some(usedCode => usedCode.toLowerCase() === code.toLowerCase())

    if (isCodeUsed) {
      setCodeError('This code is already in use. Please choose a different code.')
      return false
    }

    setCodeError('')
    return true
  }

  return {
    codeError,
    setCodeError,
    validateCode
  }
}
