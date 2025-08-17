import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Zap, Shield } from 'lucide-react';

const features = [
  {
    icon: <Clock className="w-8 h-8 text-blue-600" />,
    title: "5-Minute Setup",
    description: "Get started in minutes, not hours. Our streamlined onboarding gets you collecting reviews immediately."
  },
  {
    icon: <Zap className="w-8 h-8 text-yellow-600" />,
    title: "One-Click Integration", 
    description: "Connect your existing business profiles with a single click. No technical knowledge required."
  },
  {
    icon: <Shield className="w-8 h-8 text-green-600" />,
    title: "Secure & Compliant",
    description: "Enterprise-grade security with automatic compliance for GDPR, CCPA, and other privacy regulations."
  }
];

const steps = [
  "Create your account",
  "Connect your business profiles", 
  "Import your customer list",
  "Start collecting reviews"
];

const SimpleSetup = () => {
  return (
    <div className="py-40 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">Simple Setup</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Getting started with Blipp is incredibly simple. No complex integrations or lengthy setup processes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold mb-8 text-gray-900">Why Choose Blipp?</h2>
            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-md border border-gray-100">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 text-center">Get Started in 4 Easy Steps</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-gray-800 font-medium">{step}</span>
                    <Check className="w-5 h-5 text-green-500 ml-auto" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleSetup;

