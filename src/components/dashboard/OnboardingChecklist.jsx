import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { CheckCircle, Circle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const ChecklistItem = ({ isComplete, text, actionText, onAction }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
            {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
                <Circle className="w-5 h-5 text-gray-400" />
            )}
            <span className={isComplete ? 'line-through text-gray-500' : ''}>{text}</span>
        </div>
        {!isComplete && (
            <Button size="sm" variant="ghost" onClick={onAction}>{actionText}</Button>
        )}
    </div>
);

export const OnboardingChecklist = ({ business }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;
    
    // Mocked completion status based on business data
    const steps = [
        { id: 1, text: 'Complete your business profile', isComplete: !!business?.name, actionText: 'Go to Settings' },
        { id: 2, text: 'Upload your business logo', isComplete: !!business?.logo_url, actionText: 'Upload' },
        { id: 3, text: 'Connect your Google Review page', isComplete: !!business?.google_review_url, actionText: 'Connect' },
        { id: 4, text: 'Add your first customer', isComplete: false, actionText: 'Add Customer' }, // This would need a real check
        { id: 5, text: 'Send your first review request', isComplete: false, actionText: 'Send Request' },
    ];
    
    const completedSteps = steps.filter(s => s.isComplete).length;
    const progress = (completedSteps / steps.length) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
            >
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Let's get you set up!</CardTitle>
                                <CardDescription>Complete these steps to get the most out of Blipp.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
                                <X className="w-4 h-4"/>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                            <motion.div 
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full" 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="space-y-1">
                            {steps.map(step => (
                                <ChecklistItem key={step.id} {...step} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
};
