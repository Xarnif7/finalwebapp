
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"; // Fixed: Added missing Label import
import { Search, Send, ChevronsRight, ChevronsLeft, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const mockContacts = [
    { id: 1, name: "Sarah Johnson", lastMessage: "Thank you so much!", time: "2m", unread: 1 },
    { id: 2, name: "Mike Chen", lastMessage: "Sounds good, see you then.", time: "1h", unread: 0 },
];

const mockMessages = [
    { id: 1, sender: "them", text: "Hi! Just wanted to confirm my appointment for tomorrow at 2 PM.", time: "10:30 AM" },
    { id: 2, sender: "me", text: "Confirmed! We look forward to seeing you, Mike.", time: "10:32 AM" },
];

const mockContactDetails = {
    name: "Mike Chen",
    email: "mike.chen@example.com",
    phone: "+1 (555) 123-4567",
    lastAppointment: "2024-08-16",
    tags: ["New Patient", "Follow-up required"],
};

export default function ConversationsPage() {
    const [infoPanelOpen, setInfoPanelOpen] = useState(true);

    useEffect(() => {
        const storedState = localStorage.getItem('blipp.infoPanelOpen');
        if (storedState !== null) {
            setInfoPanelOpen(JSON.parse(storedState));
        }
    }, []);

    const toggleInfoPanel = () => {
        const newState = !infoPanelOpen;
        setInfoPanelOpen(newState);
        localStorage.setItem('blipp.infoPanelOpen', JSON.stringify(newState));
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <PageHeader
                title="Conversations"
                subtitle="Search customers, view SMS threads, and reply in real time."
            />
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Contacts List */}
                <Card className="col-span-3 rounded-2xl flex flex-col">
                    <CardHeader>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Search contacts..." className="pl-9" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {mockContacts.map(contact => (
                            <div key={contact.id} className="flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {contact.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm text-slate-900 truncate">{contact.name}</p>
                                        {contact.unread > 0 && (
                                            <Badge className="bg-blue-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
                                                {contact.unread}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 truncate">{contact.lastMessage}</p>
                                    <p className="text-xs text-slate-400">{contact.time}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Message Thread */}
                <div className={`transition-all duration-200 ease-out ${infoPanelOpen ? 'col-span-6' : 'col-span-9'}`}>
                    <Card className="rounded-2xl h-full flex flex-col">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Mike Chen</CardTitle>
                            <Button variant="ghost" size="icon" onClick={toggleInfoPanel}>
                                {infoPanelOpen ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                            {mockMessages.map(message => (
                                <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        message.sender === 'me' 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-slate-100 text-slate-900'
                                    }`}>
                                        <p className="text-sm">{message.text}</p>
                                        <p className={`text-xs mt-1 ${message.sender === 'me' ? 'text-blue-100' : 'text-slate-500'}`}>
                                            {message.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <div className="p-4 border-t border-slate-200">
                             <div className="relative">
                                <Input placeholder="Type your message..." className="pr-16" />
                                <Button size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2"><Send className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Info Panel */}
                <AnimatePresence>
                    {infoPanelOpen && (
                        <motion.div
                            className="col-span-3"
                            initial={{ width: 0, opacity: 0, x: 50 }}
                            animate={{ width: '100%', opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 50 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <Card className="rounded-2xl h-full overflow-hidden">
                                <CardHeader>
                                    <CardTitle>Contact Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                   <div>
                                       <Label>Email</Label>
                                       <div className="flex items-center gap-2 mt-1">
                                           <Mail className="w-4 h-4 text-slate-400" />
                                           <span className="text-sm">{mockContactDetails.email}</span>
                                       </div>
                                   </div>
                                    <div>
                                       <Label>Phone</Label>
                                       <div className="flex items-center gap-2 mt-1">
                                           <Phone className="w-4 h-4 text-slate-400" />
                                           <span className="text-sm">{mockContactDetails.phone}</span>
                                       </div>
                                   </div>
                                   <div>
                                       <Label>Tags</Label>
                                       <div className="flex flex-wrap gap-2 mt-1">
                                            {mockContactDetails.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                       </div>
                                   </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
