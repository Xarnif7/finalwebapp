import React from 'react';
import { motion } from 'framer-motion';
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
  return (
    <div className="py-40 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">A smarter way to manage your reputation</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Blipp is more than a review tool. It's a full-stack reputation marketing platform designed to help you grow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:-translate-y-1 hover:shadow-xl transition-all"
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
