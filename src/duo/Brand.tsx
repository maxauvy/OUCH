import { AppLogo } from '../components/ui/AppLogo'

/** OUCH's icon and "OUCH Duo", at the top of every screen: Duo is part of OUCH, and says so. */
export function Brand({ size = 36 }: { size?: number }) {
  return (
    <p className="brand">
      <AppLogo size={size} className="brand-logo" />
      <span>
        OUCH <span className="brand-duo">Duo</span>
      </span>
    </p>
  )
}
