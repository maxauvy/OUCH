import { createContext, useContext } from 'react'
import type { SoulagerView } from '../../pages/SoulagerPage'

/** Opens a screen of the Soulager tab (the breathing exercise, say); absent where the page cannot. */
export const ReliefContext = createContext<((view: SoulagerView) => void) | undefined>(undefined)
export const useOpenRelief = () => useContext(ReliefContext)
