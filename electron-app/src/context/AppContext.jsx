import { createContext, useContext } from 'react'

// Shared app-shell state (theme + language + settings) so extracted pages and
// layout components don't need theme/language threaded through every level.
// App.jsx owns the state and provides the value; consumers use useApp().
export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppContext.Provider>')
  return ctx
}
