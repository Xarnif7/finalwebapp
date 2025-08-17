import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, ExternalLink, RefreshCw, MessageCircle, TrendingUp, Loader2 } from "lucide-react";
import { ReviewTracking } from "@/api/entities";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// FIX: Added charts and polished the layout.

const mockReviews = [
    { id: 1, review_date: '2023-10-01', reviewer_name: 'John Doe', platform: 'google', rating: 5, review_text: 'Excellent service!', review_url: '#' },
    { id: 2, review_date: '2023-10-05', reviewer_name: 'Jane Smith', platform: 'yelp', rating: 4, review_text: 'Very good, but a bit pricey.', review_url: '#' },
    { id: 3, review_date: '2023-10-12', reviewer_name: 'Sam Wilson', platform: 'facebook', rating: 5, review_text: 'Best in town!', review_url: '#' },
    { id: 4, review_date: '2023-10-18', reviewer_name: 'Alice Brown', platform: 'google', rating: 3, review_text: 'It was okay.', review_url: '#' },
];

const mockChartData = [
  { name: 'Jan', rating: 4.2 },
  { name: 'Feb', rating: 4.5 },
  { name: 'Mar', rating: 4.4 },
  { name: 'Apr', rating: 4.7 },
  { name: 'May', rating: 4.8 },
  { name: 'Jun', rating: 4.9 },
];

const mockPieData = [
  { name: 'Positive', value: 75, color: '#22C55E' },
  { name: 'Neutral', value: 15, color: '#FBBF24' },
  { name: 'Negative', value: 10, color: '#EF4444' },
];

const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}/>)}
      <span className="ml-2 font-semibold">{rating}</span>
    </div>
);

export default function ReviewTrackingPage() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching data
    setTimeout(() => {
        setReviews(mockReviews);
        setIsLoading(false);
    }, 1000);
  }, []);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <div className="page-header">
            <h1 className="page-title">Review Tracking</h1>
            <p className="page-subtitle">Monitor and track reviews from all your platforms.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Average Rating Over Time</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={mockChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[4, 5]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Sentiment Analysis</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={mockPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {mockPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>A list of the latest reviews from connected platforms.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Platform</TableHead><TableHead>Rating</TableHead><TableHead>Review</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>{format(new Date(review.review_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{review.reviewer_name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{review.platform}</Badge></TableCell>
                        <TableCell><StarRating rating={review.rating} /></TableCell>
                        <TableCell><div className="max-w-xs truncate">{review.review_text}</div></TableCell>
                        <TableCell><a href={review.review_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><ExternalLink className="w-4 h-4" /></a></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-center pt-4 border-t mt-4">
                <Button variant="outline">Load more reviews</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


