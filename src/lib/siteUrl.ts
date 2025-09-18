/**
 * Get the site URL for OAuth redirects
 * Uses the centralized env helper
 */
import { env } from './env';

export function getSiteUrl(): string {
  return env.SITE_URL;
}
