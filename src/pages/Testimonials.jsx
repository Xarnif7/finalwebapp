import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Johnson",
    business: "Johnson Family Dental",
    review: "Blipp transformed our online reputation. We went from 12 reviews to over 200 in just 6 months, and our average rating improved from 3.8 to 4.9 stars.",
    rating: 5,
    avatar: "SJ"
  },
  {
    name: "Mike Rodriguez",
    business: "Rodriguez Auto Repair",
    review: "The automated sequences are incredible. We set it up once and now every customer gets a perfectly timed review request. Our response rate is through the roof.",
    rating: 5,
    avatar: "MR"
  },
  {
    name: "Emily Chen",
    business: "Wellness Spa & Beauty",
    review: "The AI reply suggestions save us hours every week. We can respond to reviews professionally and quickly, which our customers really appreciate.",
    rating: 5,
    avatar: "EC"
  },
  {
    name: "David Thompson",
    business: "Thompson Law Firm",
    review: "The competitor tracking feature gives us insights we never had before. We can see exactly how we stack up and where to focus our efforts.",
    rating: 5,
    avatar: "DT"
  },
  {
    name: "Lisa Park",
    business: "Park Family Restaurant",
    review: "Revenue impact tracking showed us that good reviews directly correlate with new customers. Blipp helped us understand the ROI of reputation management.",
    rating: 5,
    avatar: "LP"
  },
  {
    name: "James Wilson",
    business: "Wilson Fitness Center",
    review: "The conversations feature lets us engage with customers via SMS seamlessly. It's like having a dedicated customer service rep for reviews.",
    rating: 5,
    avatar: "JW"
  }
];

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const Testimonials = () => {
  return (
    <div className="py-40 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">What Our Customers Say</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join hundreds of businesses that have transformed their online reputation with Blipp.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <Quote className="w-8 h-8 text-blue-600 mb-4 opacity-60" />
              
              <StarRating rating={testimonial.rating} />
              
              <p className="text-gray-700 leading-relaxed my-4">
                "{testimonial.review}"
              </p>
              
              <div className="flex items-center gap-3 mt-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.business}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
