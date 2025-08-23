import React, { useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageCircle, BarChart3, Repeat, Compass, Zap, Brain } from 'lucide-react';

const features = [
  {
    icon: <MessageCircle className="w-8 h-8 text-blue-600" />,
    title: 'Conversations Inbox',
    description: 'Engage in two-way SMS with customers, enhanced with AI suggestions in a unified timeline.'
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-green-600" />,
    title: 'Review Performance',
    description: 'Track cross-platform trends, analyze review sources, and monitor your team\'s reply rate.'
  },
  {
    icon: <Repeat className="w-8 h-8 text-purple-600" />,
    title: 'Automated Sequences',
    description: 'Create multi-step SMS & email follow-ups with intelligent throttling and scheduling.'
  },
  {
    icon: <Compass className="w-8 h-8 text-orange-600" />,
    title: 'Competitor Tracking',
    description: 'Benchmark your ratings, review volume, and market position against your local competitors.'
  },
  {
    icon: <Zap className="w-8 h-8 text-red-600" />,
    title: 'Revenue Impact',
    description: 'Connect reviews to customer lifetime value and project your potential revenue growth.'
  },
  {
    icon: <Brain className="w-8 h-8 text-indigo-600" />,
    title: 'AI Insights',
    description: 'Leverage AI to predict customer satisfaction and suggest actions to improve reviews.'
  }
];

const Features = () => {
  // Performance instrumentation for data fetching
  useEffect(() => {
    performance.mark('features-component-ready');
    console.log('[FEATURES-PERF] Component ready - no data fetching required');
    
    // Track first content paint
    setTimeout(() => {
      performance.mark('features-content-paint');
      performance.measure('features-paint-time', 'features-component-ready', 'features-content-paint');
      const paintMeasure = performance.getEntriesByName('features-paint-time')[0];
      console.log(`[FEATURES-PERF] Content paint time: ${paintMeasure.duration.toFixed(2)}ms`);
    }, 50);
  }, []);

  return (
    <div className="py-24 lg:py-28 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900">A smarter way to manage your reputation</h1>
          <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Blipp is more than a review tool. It's a full-stack reputation marketing platform designed to help you grow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.1 }}
              viewport={{ once: true, amount: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transform-gpu will-change-[transform,opacity] hover:translate-y-[-2px] hover:shadow-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <div className="mb-6 flex justify-start">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;


