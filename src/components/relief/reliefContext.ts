import { createContext, useContext } from 'react'

/** Opens "Un moment pour souffler"; absent where the page cannot open it. */
export const ReliefContext = createContext<(() => void) | undefined>(undefined)
export const useOpenRelief = () => useContext(ReliefContext)
