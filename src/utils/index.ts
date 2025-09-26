


export function createPageUrl(pageName: string) {
    // Convert PascalCase to kebab-case
    const kebabCase = pageName
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, ''); // Remove leading dash
    
    const result = '/' + kebabCase;
    
    // Navigation helper validation (only in development)
    if (process.env.NODE_ENV === 'development') {
        console.log(`[NAV-HELPER] createPageUrl("${pageName}") → "${result}"`);
        
        // Track usage for performance analysis
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (currentPath === result) {
                console.log(`[NAV-HELPER] ✓ Route match: "${result}" matches current path`);
            } else {
                console.log(`[NAV-HELPER] ⚠ Route mismatch: "${result}" vs current "${currentPath}"`);
            }
        }
    }
    
    return result;
}


