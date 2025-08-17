
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Repeat, CheckCircle, Clock, ArrowRight, MessageSquare, Mail, Edit, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const mockSequences = [
  {
    id: "1",
    name: "New Customer Welcome",
    description: "Engage new customers and ask for a review.",
    active: true,
    total_enrolled: 156,
    completion_rate: 82,
    steps: [
      { delay_days: 1, channel: "sms", template: "Welcome SMS" },
      { delay_days: 7, channel: "email", template: "7-Day Follow Up" }
    ]
  },
  {
    id: "2",
    name: "Post-Service Follow-up",
    description: "Check in with customers after their service.",
    active: false,
    total_enrolled: 89,
    completion_rate: 65,
    steps: [
      { delay_days: 3, channel: "email", template: "How was your service?" }
    ]
  }
];

export default function SequencesPage() {
  const [sequences, setSequences] = useState(mockSequences);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleDeleteSequence = (id) => {
    if (window.confirm("Are you sure you want to delete this sequence? This action cannot be undone.")) {
      setSequences(prev => prev.filter(seq => seq.id !== id));
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Automation Sequences"
        subtitle="Create and manage multi-step follow-up campaigns."
      />

      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Sequence
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sequences.map((sequence, i) => (
          <motion.div
            key={sequence.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="rounded-2xl h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{sequence.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{sequence.description}</p>
                  </div>
                  <Switch checked={sequence.active} onCheckedChange={() => {}} />
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {sequence.steps.map((step, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <ArrowRight className="w-4 h-4 text-slate-400" />}
                      <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                        {step.channel === 'sms' ? <MessageSquare className="w-3 h-3"/> : <Mail className="w-3 h-3"/>}
                        <span>{step.template} after {step.delay_days}d</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
              <div className="p-6 pt-0 mt-4 flex justify-between items-center border-t border-slate-100">
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{sequence.total_enrolled}</span>
                    <span className="text-slate-500">enrolled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{sequence.completion_rate}%</span>
                    <span className="text-slate-500">completed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteSequence(sequence.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Sequence</DialogTitle></DialogHeader>
          {/* Form would go here */}
        </DialogContent>
      </Dialog>
    </div>
  );
}


