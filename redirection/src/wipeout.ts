export const deleteStorages = async () => {
  localStorage.clear()
  sessionStorage.clear()
}

export const deleteCaches = async () => {
  const cacheKeys = await caches.keys()
  await Promise.all(cacheKeys.map(cacheKey => caches.delete(cacheKey)))
}

export const deleteIndexedDb = async () => {
  // `indexedDB.databases` has limited support.
  await new Promise<Event>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('application')
    request.addEventListener('success', resolve)
    request.addEventListener('error', reject)
  })
}
