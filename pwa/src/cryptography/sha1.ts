export const sha1 = async (message: string): Promise<string> => {
  const messageUint8Array = new TextEncoder().encode(message)
  const hashArrayBuffer = await crypto.subtle.digest('SHA-1', messageUint8Array)
  const hashByteArray = Array.from(new Uint8Array(hashArrayBuffer))
  return hashByteArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}
