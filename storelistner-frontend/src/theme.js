/**
 * Storelistener — Legacy Theme Alias pointing to Centralized Theme Configuration
 * File: src/theme.js
 * 
 * Re-exports the centralized theme from src/theme/theme.config.js
 */

import { storelistenerTheme, paletteTokens, layoutTokens, typographyTokens } from './theme/theme.config';

// Primary theme exports
export { storelistenerTheme, paletteTokens, layoutTokens, typographyTokens };
export const greenWhiteTheme = storelistenerTheme;
export default storelistenerTheme;
