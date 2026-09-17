// src/shared/utils/consent.ts
import { COOKIE_CONSENT_STORAGE_KEY } from '../constants'

/**
 * Reads functional-cookie consent from `localStorage` under
 * `COOKIE_CONSENT_STORAGE_KEY` — never written by this module on its own
 * (only via `persistence.grant()/revoke()`), and can also come from the
 * consumer app's own cookie-consent UI, as long as it writes the same shape
 * (`{ functionality: boolean }`).
 */
export function hasCookieConsent(): boolean {
  if (typeof localStorage === 'undefined') return false

  const consentData = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  if (!consentData) return false

  try {
    const consent = JSON.parse(consentData)
    return consent?.functionality === true
  }
  catch {
    return false
  }
}
