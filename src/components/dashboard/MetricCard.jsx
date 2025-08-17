import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatNumber, calculateGrowth } from '@/components/lib/utils'

const MetricCard = ({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  trend = "up",
  format = "number",
  delay = 0,
  className,
  onClick
}) => {
  const growth = previousValue ? calculateGrowth(value, previousValue) : 0
  const isPositive = growth > 0
  const isNeutral = growth === 0

  const formatValue = (val) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      case 'percentage':
        return `${val}%`
      case 'rating':
        return `${val}/5`
      default:
        return formatNumber(val)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={className}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-white to-gray-50",
          onClick && "hover:scale-[1.02]"
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <div className="flex items-baseline gap-2">
                <motion.p 
                  className="text-3xl font-bold text-gray-900"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  key={value}
                >
                  {formatValue(value)}
                </motion.p>
                {previousValue !== undefined && !isNeutral && (
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <Badge 
                      variant={isPositive ? "success" : "destructive"}
                      className="text-xs font-medium"
                    >
                      {Math.abs(growth)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {previousValue !== undefined && (
            <div className="mt-4 flex items-center text-xs text-gray-500">
              <span>vs last period: {formatValue(previousValue)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default MetricCard


