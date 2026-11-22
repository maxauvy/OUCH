import { createContext, useContext } from 'react'

/** Opens Settings › Mes données on the backup (the automatic backup's card first); absent where the page cannot. */
export const BackupContext = createContext<(() => void) | undefined>(undefined)
export const useOpenBackup = () => useContext(BackupContext)
