import React from 'react';
import { motion } from 'framer-motion';

const PageHeader = ({ title, subtitle, isDashboard = false }) => {
  const h1Class = isDashboard 
    ? "text-4xl md:text-5xl font-bold text-slate-900 tracking-tight"
    : "text-3xl font-semibold text-slate-900";

  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className={h1Class}>{title}</h1>
      {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
    </motion.div>
  );
};

export default PageHeader;