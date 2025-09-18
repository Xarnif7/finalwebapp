import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, User, Shield, UserCheck, Trash2 } from 'lucide-react';
import { useCurrentBusinessId, getBusinessInfo, getTeamMembers } from '@/lib/tenancy';
import { toast } from 'react-hot-toast';

export default function TeamRolesPage() {
  const { businessId, loading: businessLoading, error: businessError } = useCurrentBusinessId();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'staff'
  });

  // Load business info and team members
  useEffect(() => {
    if (businessId) {
      loadBusinessData();
    }
  }, [businessId]);

  const loadBusinessData = async () => {
    setLoading(true);
    try {
      const [business, members] = await Promise.all([
        getBusinessInfo(businessId),
        getTeamMembers(businessId)
      ]);
      
      setBusinessInfo(business);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load business data:', error);
      toast.error('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!businessId) return;

    setLoading(true);
    try {
      // TODO: Implement actual invitation logic
      // For now, just show a placeholder
      toast.success(`Invitation sent to ${inviteData.email}`);
      setInviteData({ email: '', role: 'staff' });
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;

    setLoading(true);
    try {
      // TODO: Implement actual removal logic
      toast.success('Team member removed');
      await loadBusinessData();
    } catch (error) {
      console.error('Failed to remove team member:', error);
      toast.error('Failed to remove team member');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      owner: 'default',
      admin: 'secondary',
      staff: 'outline'
    };
    
    const icons = {
      owner: Shield,
      admin: UserCheck,
      staff: User
    };
    
    const Icon = icons[role] || User;
    
    return (
      <Badge variant={variants[role] || 'outline'} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {role}
      </Badge>
    );
  };

  if (businessError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team & Roles</h1>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">
              <div className="text-lg font-medium mb-2">Business Access Error</div>
              <div className="text-sm">{businessError}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (businessLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team & Roles</h1>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team & Roles</h1>
        <p className="text-muted-foreground">Manage your team members and their permissions</p>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          {businessInfo ? (
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Business Name</Label>
                <p className="text-sm text-muted-foreground">{businessInfo.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Business ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{businessInfo.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(businessInfo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Loading business information...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Members</CardTitle>
          <Button onClick={() => setShowInviteForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <div className="text-lg font-medium mb-2">No team members</div>
              <div className="text-sm mb-4">Invite team members to collaborate on your business</div>
              <Button onClick={() => setShowInviteForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Invite First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.auth_users?.email || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(member.role)}
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="team@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}