import type { VaultAdapter } from '../domain/vaultPort';
import { TauriVaultAdapter } from './tauriVaultAdapter';
import { InMemoryVaultAdapter } from './inMemoryVaultAdapter';

export type { VaultAdapter } from '../domain/vaultPort';
export { TauriVaultAdapter } from './tauriVaultAdapter';
export { InMemoryVaultAdapter } from './inMemoryVaultAdapter';

/**
 * Checks if running inside the Tauri native desktop environment.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let defaultInstance: VaultAdapter | null = null;

/**
 * Returns the default singleton VaultAdapter instance matching the current runtime.
 */
export function getDefaultVaultAdapter(): VaultAdapter {
  if (!defaultInstance) {
    defaultInstance = isTauriEnvironment() ? new TauriVaultAdapter() : new InMemoryVaultAdapter();
  }
  return defaultInstance;
}

/**
 * Global default adapter instance for backward-compatible consumption.
 */
export const vaultAdapter: VaultAdapter = new Proxy({} as VaultAdapter, {
  get(_target, prop: keyof VaultAdapter) {
    const instance = getDefaultVaultAdapter();
    const val = instance[prop];
    return typeof val === 'function' ? (val as Function).bind(instance) : val;
  },
});
