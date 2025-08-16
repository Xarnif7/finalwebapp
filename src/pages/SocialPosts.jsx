import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Settings, Brain, Instagram, CheckCircle, Clock, Play, Pause, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const mockPosts = [
  { id: "1", review_text: "Amazing service! The staff was incredibly helpful...", platform: "instagram", status: "posted", image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400" },
  { id: "2", review_text: "The team was so professional and the results...", platform: "facebook", status: "scheduled", image_url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400" },
  { id: "3", review_text: "Highly recommend this business!", platform: "instagram", status: "draft", image_url: "https://images.unsplash.com/photo-1529612669824-e3e284c6c043?w=400" },
];

const mockRules = [
  { id: 'r1', name: "Post 5-star Google reviews", platform: "instagram", active: true },
  { id: 'r2', name: "Post positive Yelp reviews", platform: "facebook", active: false }
];

export default function SocialPostsPage() {
  const [posts, setPosts] = useState(mockPosts);
  const [rules, setRules] = useState(mockRules);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteRule = (id) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      setRules(prev => prev.filter(rule => rule.id !== id));
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Social Posts"
        subtitle="Turn your best reviews into engaging social media content."
      />
      
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Automation Rules</CardTitle>
            <CardDescription>Automatically create posts from new reviews.</CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Rule</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${rule.platform === 'instagram' ? 'bg-pink-100' : 'bg-blue-100'}`}>
                  <Instagram className={`w-5 h-5 ${rule.platform === 'instagram' ? 'text-pink-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{rule.name}</p>
                  <p className="text-sm text-slate-500">Posts to {rule.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.active} onCheckedChange={() => setRules(rules.map(r => r.id === rule.id ? {...r, active: !r.active} : r))} />
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Post Library</h3>
        <Button variant="outline"><Brain className="w-4 h-4 mr-2" /> Generate New Posts</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="rounded-2xl overflow-hidden">
              <img src={post.image_url} alt="Social post preview" className="w-full h-48 object-cover" />
              <CardContent className="p-4">
                <p className="text-sm text-slate-600 line-clamp-2">"{post.review_text}"</p>
                <div className="flex items-center justify-between mt-4">
                  <Badge variant={post.status === 'posted' ? 'success' : post.status === 'scheduled' ? 'info' : 'secondary'}>
                    {post.status === 'posted' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {post.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                    {post.status}
                  </Badge>
                  <div className={`p-1.5 rounded-full ${post.platform === 'instagram' ? 'bg-pink-100' : 'bg-blue-100'}`}>
                    <Instagram className={`w-4 h-4 ${post.platform === 'instagram' ? 'text-pink-600' : 'text-blue-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Rule</DialogTitle></DialogHeader>
          {/* Form would go here */}
        </DialogContent>
      </Dialog>
    </div>
  );
}