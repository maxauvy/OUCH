import { IconBed, IconDroplets, IconFlame, IconSnowflake, IconStar, IconStethoscope, IconWalk, IconWind, IconYoga, type Icon } from '@tabler/icons-react'

/** A small picture for the usual ones; a star for the others. */
export function gestureIcon(name: string): Icon {
  const n = name.toLocaleLowerCase()
  if (/bain|bath|douche|shower/.test(n)) return IconDroplets
  if (/marche|walk/.test(n)) return IconWalk
  if (/étir|stretch|yoga/.test(n)) return IconYoga
  if (/repos|sieste|rest|nap|sommeil|sleep/.test(n)) return IconBed
  if (/chaleur|bouillotte|heat|hot/.test(n)) return IconFlame
  if (/froid|glace|cold|ice/.test(n)) return IconSnowflake
  if (/kiné|soin|physio|care/.test(n)) return IconStethoscope
  if (/respir|médit|breath|medit/.test(n)) return IconWind
  return IconStar
}
