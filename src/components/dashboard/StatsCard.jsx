
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, gradient, trend, linkTo, isExternalLink = false }) {
  const cardContent = (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full cursor-pointer"
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 h-full group">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-500`}></div>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}></div>
        
        <CardContent className="p-6 relative flex flex-col justify-between h-full">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">{title}</p>
            <motion.div 
              className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:shadow-xl`}
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-6 h-6 text-white" />
            </motion.div>
          </div>
          <div>
            <motion.p 
              className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-gray-800 transition-colors"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {value}
            </motion.p>
            {trend && (
              <p className="text-sm text-gray-500 mt-2 group-hover:text-gray-600 transition-colors">{trend}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (linkTo) {
    if (isExternalLink) {
        return (
            <a href={linkTo} target="_blank" rel="noopener noreferrer" className="block h-full">
                {cardContent}
            </a>
        )
    }
    return (
      <Link to={linkTo} className="block h-full">
        {cardContent}
      </Link>
    );
  }
  
  return cardContent;
}

