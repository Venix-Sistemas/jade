// runtime/composables/useVenixIcon.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { resolveIcon } from '../../shared/utils/icon'
import type { ResolvedIcon } from '../../shared/utils/icon'

export function useJadeIcon(icon: string | Ref<string> | ComputedRef<string>): ComputedRef<ResolvedIcon> {
  const config = useRuntimeConfig()
  const aliases = config.public.venixTheme?.icon?.aliases || {}

  return computed(() => {
    const value = typeof icon === 'string' ? icon : icon.value
    return resolveIcon(value, aliases)
  })
}

/** @deprecated Renamed to `useJadeIcon`; removed in 2.0. */
export const useVenixIcon = useJadeIcon
