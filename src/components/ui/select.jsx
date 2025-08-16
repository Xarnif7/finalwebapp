
import * as React from "react"
import { cn } from "@/components/lib/utils"
import { ChevronDown } from "lucide-react"

const Select = ({ children, value, onValueChange, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value)

  React.useEffect(() => {
    setSelectedValue(value)
  }, [value])

  const handleSelect = (newValue) => {
    setSelectedValue(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" {...props}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) {
          return child; // Gracefully handle null/undefined children
        }
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => setIsOpen(!isOpen),
            selectedValue,
            isOpen
          })
        }
        if (child.type === SelectContent) {
          return React.cloneElement(child, {
            isOpen,
            onSelect: handleSelect
          })
        }
        return child
      })}
    </div>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, onClick, selectedValue, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    onClick={onClick}
    {...props}
  >
    {children}
    <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
  </button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, children }) => {
  return <span>{children || placeholder}</span>
}

const SelectContent = React.forwardRef(({ className, children, isOpen, onSelect, ...props }, ref) => (
  isOpen && (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 w-full rounded-md border border-gray-200 bg-white py-1 shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) {
          return child; // Gracefully handle null/undefined children
        }
        if (child.type === SelectItem) {
          return React.cloneElement(child, { onSelect })
        }
        return child
      })}
    </div>
  )
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, onSelect, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
      className
    )}
    onClick={() => onSelect && onSelect(value)}
    {...props}
  >
    {children}
  </div>
))
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
