import * as React from "react"
import { cn } from "@/components/lib/utils"
import { cva } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5",
        outline:
          "border-2 border-slate-200 bg-white text-gray-900 shadow-md hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5",
        secondary:
          "bg-slate-100 text-slate-900 shadow-md hover:bg-slate-200 hover:shadow-lg hover:-translate-y-0.5",
        ghost: "hover:bg-slate-100 hover:text-slate-900 rounded-xl",
        link: "text-blue-600 underline-offset-4 hover:underline",
        gradient: "brand-gradient text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        xs: "h-8 px-3 text-xs rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? "span" : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    >
      {children}
    </Comp>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
