
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Shield, Briefcase, User, Eye, Mail, Phone, MoreVertical, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const roleConfig = {
  owner: { icon: Shield, color: "text-indigo-800", bg: "bg-indigo-100", label: "Owner" },
  admin: { icon: Shield, color: "text-blue-800", bg: "bg-blue-100", label: "Admin" },
  manager: { icon: Briefcase, color: "text-purple-800", bg: "bg-purple-100", label: "Manager" },
  staff: { icon: User, color: "text-teal-800", bg: "bg-teal-100", label: "Staff" },
  viewer: { icon: Eye, color: "text-gray-800", bg: "bg-gray-100", label: "Viewer" }
};

const mockTeamMembers = [
  { id: "1", full_name: "Alex Johnson", email: "alex@blipp.com", role: "owner", active: true, last_login: "2024-01-15T14:30:00Z" },
  { id: "2", full_name: "Sarah Wilson", email: "sarah@company.com", role: "admin", active: true, last_login: "2024-01-15T12:15:00Z" },
  { id: "3", full_name: "Mike Chen", email: "mike@company.com", role: "staff", active: true, last_login: "2024-01-14T16:45:00Z" },
  { id: "4", full_name: "Emily Rodriguez", email: "emily@company.com", role: "viewer", active: false, last_login: "2024-01-10T09:30:00Z" }
];

export default function TeamRolesPage() {
  const [teamMembers, setTeamMembers] = useState(mockTeamMembers);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    full_name: "",
    email: "",
    role: "staff"
  });

  const handleInviteMember = () => {
    const member = {
      id: Date.now().toString(),
      ...newMember,
      active: true,
      last_login: null
    };
    setTeamMembers([...teamMembers, member]);
    setNewMember({ full_name: "", email: "", role: "staff" });
    setInviteModalOpen(false);
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  const handleDeleteMember = (memberId) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    }
  };

  const getUserInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Team & Roles"
        subtitle="Manage who has access to your Blipp account."
      />

      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600">
          {teamMembers.filter(m => m.active).length} active members
        </div>
        <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-4">
        {teamMembers.map((member, i) => {
          const roleInfo = roleConfig[member.role];
          const RoleIcon = roleInfo.icon;
          
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {getUserInitials(member.full_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-900">{member.full_name}</h3>
                          <Badge className={`${roleInfo.bg} ${roleInfo.color} gap-1 transition-transform hover:scale-105`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleInfo.label}
                          </Badge>
                          {!member.active && <Badge variant="secondary" className="transition-transform hover:scale-105">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                          {member.last_login ? (
                            <div>Last login: {new Date(member.last_login).toLocaleDateString()}</div>
                          ) : (
                            <div>Invitation pending</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditMember(member)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {member.role !== 'owner' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(member.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Role Legend */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(roleConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <div key={key} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className={`p-1 rounded ${config.bg}`}>
                    <IconComponent className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={newMember.full_name}
                onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newMember.role} onValueChange={(value) => setNewMember({...newMember, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteMember} disabled={!newMember.full_name || !newMember.email}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
