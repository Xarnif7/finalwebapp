import * as React from "react"

const TooltipProvider = ({ children }) => {
  if (!children) return null;
  return <div>{children}</div>
}

const Tooltip = ({ children }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  
  if (!children) return null;
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) => {
        // Ensure child exists and is valid before processing
        if (!child || !React.isValidElement(child)) {
          return child;
        }
        
        if (child.type === TooltipTrigger) {
          return React.cloneElement(child, {
            ...child.props,
            onMouseEnter: () => setIsVisible(true),
            onMouseLeave: () => setIsVisible(false)
          })
        }
        if (child.type === TooltipContent && isVisible) {
          return child
        }
        return child
      })}
    </div>
  )
}

const TooltipTrigger = ({ children, onMouseEnter, onMouseLeave, asChild, ...props }) => {
  if (!children) return null;
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      ...props,
      onMouseEnter,
      onMouseLeave
    })
  }
  
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...props}>
      {children}
    </div>
  )
}

const TooltipContent = ({ children, className = "", ...props }) => {
  if (!children) return null;
  
  return (
    <div
      className={`absolute z-50 overflow-hidden rounded-md border bg-white px-3 py-1.5 text-sm text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95 -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full ${className}`}
      {...props}
    >
      {children}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }