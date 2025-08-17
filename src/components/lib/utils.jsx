// Simple utility functions without external dependencies

export function cn(...inputs) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

export function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Simple class variance authority replacement
export function cva(base, config = {}) {
  return (props = {}) => {
    let classes = base || ''
    
    if (config.variants && props) {
      Object.keys(config.variants).forEach(key => {
        const value = props[key]
        if (value && config.variants[key][value]) {
          classes += ' ' + config.variants[key][value]
        }
      })
    }
    
    if (config.defaultVariants) {
      Object.keys(config.defaultVariants).forEach(key => {
        if (!props[key]) {
          const defaultValue = config.defaultVariants[key]
          if (config.variants[key] && config.variants[key][defaultValue]) {
            classes += ' ' + config.variants[key][defaultValue]
          }
        }
      })
    }
    
    return classes.replace(/\s+/g, ' ').trim()
  }
}

