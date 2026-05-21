export const getAvatarSrc = (avatar?: string | null): string | undefined => {
  if (!avatar) return undefined

  if (avatar.startsWith('data:') || avatar.startsWith('http')) {
    return avatar
  }

  return `data:image/jpeg;base64,${avatar}`
}

export const getEmployeeAvatarSrc = getAvatarSrc
