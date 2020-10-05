export const persistanceBits = {
  session: true,
  local: true
}

export const shutDownLocalStorage = () => {
  persistanceBits.local = false
  localStorage.clear()
}

export const shutDownSessionStorage = () => {
  persistanceBits.session = false
  sessionStorage.clear()
}
