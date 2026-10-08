// How OUCH can be installed from where it runs, without asking the network or
// storing anything: the page's own display mode and the browser's user agent.

export type InstallKind =
  /** Already opened as an installed app: nothing to show */
  | 'installed'
  /** The browser offers its own install prompt (Chrome, Edge…) */
  | 'prompt'
  /** Safari on iPhone or iPad: no prompt, the person goes through Share */
  | 'ios-safari'
  /** Another browser on iPhone or iPad */
  | 'ios-other'
  /** Anything else: the browser's menu */
  | 'other'

export interface InstallEnv {
  /** Opened from the home screen or as an installed app */
  standalone: boolean
  userAgent: string
  /** `navigator.platform` and touch points: an iPad can pose as a Mac */
  platform: string
  maxTouchPoints: number
  /** The browser has handed over an install prompt that can still be shown */
  canPrompt: boolean
}

const IOS_OTHER_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//

export function installKind(env: InstallEnv): InstallKind {
  if (env.standalone) return 'installed'
  if (env.canPrompt) return 'prompt'
  const ios = /iPhone|iPad|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1)
  if (!ios) return 'other'
  return /Version\/[\d.]+.*Safari\//.test(env.userAgent) && !IOS_OTHER_BROWSERS.test(env.userAgent) ? 'ios-safari' : 'ios-other'
}
