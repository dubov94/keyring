export const persistanceBits = {
  local: true
}

export const shutDownLocalStorage = () => {
  persistanceBits.local = false
  localStorage.clear()
}
