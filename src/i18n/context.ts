import { createContext } from 'react'
import type { Language } from './language'

export const I18nContext = createContext<Language>('fr')
