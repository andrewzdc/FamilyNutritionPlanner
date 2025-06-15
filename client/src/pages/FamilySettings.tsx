import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFamily } from "@/contexts/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Users, Settings, UserPlus, Crown, Shield, Trash2, Copy, Mail, Calendar, ShoppingCart } from "lucide-react";
import type { Family, FamilyMembership } from "@shared/schema";

const familySchema = z.object({
  name: z.string().min(1, "Family name is required"),
  description: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  weekStartsOn: z.enum(["sunday", "monday"]),
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member"]),
  displayName: z.string().min(1, "Display name is required"),
});

const familyPreferencesSchema = z.object({
  allowGuestAccess: z.boolean(),
  requireApprovalForNewRecipes: z.boolean(),
  sharedShoppingLists: z.boolean(),
  sharedMealPlanning: z.boolean(),
  automaticNutritionTracking: z.boolean(),
  enableAchievements: z.boolean(),
  defaultMealPlanVisibility: z.enum(["private", "family", "public"]),
  budgetTracking: z.boolean(),
  monthlyBudget: z.number().optional(),
});

type FamilyFormData = z.infer<typeof familySchema>;
type InviteFormData = z.infer<typeof inviteSchema>;
type FamilyPreferencesData = z.infer<typeof familyPreferencesSchema>;

export default function FamilySettings() {
  const { currentFamily, setCurrentFamily } = useFamily();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMembership | null>(null);

  // Fetch family members
  const { data: familyMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'members'],
    enabled: !!currentFamily?.id,
  });

  // Fetch family preferences
  const { data: familyPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'preferences'],
    enabled: !!currentFamily?.id,
  });

  // Get current user's role in family
  const currentUserMembership = Array.isArray(familyMembers) ? 
    familyMembers.find((member: any) => member.userId === user?.id) : null;
  const isAdmin = currentUserMembership?.role === 'admin';

  const familyForm = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: currentFamily?.name || "",
      description: currentFamily?.description || "",
      timezone: currentFamily?.timezone || "America/New_York",
      currency: currentFamily?.currency || "USD",
      weekStartsOn: currentFamily?.weekStartsOn || "sunday",
    },
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
      displayName: "",
    },
  });

  const preferencesForm = useForm<FamilyPreferencesData>({
    resolver: zodResolver(familyPreferencesSchema),
    defaultValues: {
      allowGuestAccess: familyPreferences?.allowGuestAccess ?? false,
      requireApprovalForNewRecipes: familyPreferences?.requireApprovalForNewRecipes ?? false,
      sharedShoppingLists: familyPreferences?.sharedShoppingLists ?? true,
      sharedMealPlanning: familyPreferences?.sharedMealPlanning ?? true,
      automaticNutritionTracking: familyPreferences?.automaticNutritionTracking ?? false,
      enableAchievements: familyPreferences?.enableAchievements ?? true,
      defaultMealPlanVisibility: familyPreferences?.defaultMealPlanVisibility || "family",
      budgetTracking: familyPreferences?.budgetTracking ?? false,
      monthlyBudget: familyPreferences?.monthlyBudget || 500,
    },
  });

  // Update family mutation
  const updateFamilyMutation = useMutation({
    mutationFn: async (data: FamilyFormData) => {
      return await apiRequest(`/api/families/${currentFamily?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (updatedFamily) => {
      setCurrentFamily(updatedFamily);
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      toast({ title: "Family settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update family settings", variant: "destructive" });
    },
  });

  // Update family preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: FamilyPreferencesData) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'preferences'] });
      toast({ title: "Family preferences updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update family preferences", variant: "destructive" });
    },
  });

  // Invite family member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'members'] });
      toast({ title: "Family invitation sent successfully!" });
      setInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to send family invitation", variant: "destructive" });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'members'] });
      toast({ title: "Member role updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update member role", variant: "destructive" });
    },
  });

  // Remove family member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'members'] });
      toast({ title: "Family member removed successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to remove family member", variant: "destructive" });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'member': return <Users className="h-4 w-4 text-blue-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const generateInviteLink = () => {
    const inviteCode = Math.random().toString(36).substring(2, 15);
    const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Invite link copied to clipboard!" });
  };

  if (membersLoading || preferencesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentFamily) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Family Selected</h2>
        <p className="text-gray-600 mb-4">Please select or create a family to manage settings.</p>
        <Button onClick={() => window.location.href = '/families'}>
          Manage Families
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Settings</h1>
          <p className="text-gray-600">Manage your family group and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Family Information</CardTitle>
              <CardDescription>
                Basic information about your family group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={familyForm.handleSubmit((data) => updateFamilyMutation.mutate(data))} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="familyName">Family Name</Label>
                  <Input
                    id="familyName"
                    {...familyForm.register("name")}
                    placeholder="Enter your family name"
                    disabled={!isAdmin}
                  />
                  {familyForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{familyForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...familyForm.register("description")}
                    placeholder="Tell us about your family..."
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={familyForm.watch("timezone")}
                      onValueChange={(value) => familyForm.setValue("timezone", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={familyForm.watch("currency")}
                      onValueChange={(value) => familyForm.setValue("currency", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select
                    value={familyForm.watch("weekStartsOn")}
                    onValueChange={(value) => familyForm.setValue("weekStartsOn", value as any)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select first day of week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={updateFamilyMutation.isPending}>
                    {updateFamilyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Family Members ({familyMembers.length})
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={generateInviteLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Link
                      </Button>
                      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Family Member</DialogTitle>
                            <DialogDescription>
                              Send an invitation to join your family group
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={inviteForm.handleSubmit((data) => inviteMemberMutation.mutate(data))} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="email">Email Address</Label>
                              <Input
                                id="email"
                                type="email"
                                {...inviteForm.register("email")}
                                placeholder="Enter email address"
                              />
                              {inviteForm.formState.errors.email && (
                                <p className="text-sm text-red-600">{inviteForm.formState.errors.email.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="displayName">Display Name</Label>
                              <Input
                                id="displayName"
                                {...inviteForm.register("displayName")}
                                placeholder="Enter display name"
                              />
                              {inviteForm.formState.errors.displayName && (
                                <p className="text-sm text-red-600">{inviteForm.formState.errors.displayName.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select
                                value={inviteForm.watch("role")}
                                onValueChange={(value) => inviteForm.setValue("role", value as any)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={inviteMemberMutation.isPending}>
                                {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {familyMembers.map((member: FamilyMembership) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user?.profileImageUrl} />
                          <AvatarFallback>
                            {member.displayName?.[0] || member.user?.firstName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.displayName || member.user?.firstName || 'Unknown User'}
                            </span>
                            {member.userId === user?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{member.user?.email}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                        
                        {isAdmin && member.userId !== user?.id && (
                          <div className="flex gap-1">
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateMemberRoleMutation.mutate({ 
                                memberId: member.id, 
                                role: value 
                              })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.displayName} from the family? 
                                    They will lose access to all family data and will need to be re-invited.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => removeMemberMutation.mutate(member.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Member
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Family Preferences
              </CardTitle>
              <CardDescription>
                Configure how your family uses the meal planning features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={preferencesForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sharedShoppingLists">Shared Shopping Lists</Label>
                      <p className="text-sm text-gray-500">Allow all family members to view and edit shopping lists</p>
                    </div>
                    <Switch
                      id="sharedShoppingLists"
                      checked={preferencesForm.watch("sharedShoppingLists")}
                      onCheckedChange={(checked) => preferencesForm.setValue("sharedShoppingLists", checked)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sharedMealPlanning">Shared Meal Planning</Label>
                      <p className="text-sm text-gray-500">Enable collaborative meal planning for all family members</p>
                    </div>
                    <Switch
                      id="sharedMealPlanning"
                      checked={preferencesForm.watch("sharedMealPlanning")}
                      onCheckedChange={(checked) => preferencesForm.setValue("sharedMealPlanning", checked)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableAchievements">Enable Achievements</Label>
                      <p className="text-sm text-gray-500">Track cooking achievements and progress for family members</p>
                    </div>
                    <Switch
                      id="enableAchievements"
                      checked={preferencesForm.watch("enableAchievements")}
                      onCheckedChange={(checked) => preferencesForm.setValue("enableAchievements", checked)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="automaticNutritionTracking">Automatic Nutrition Tracking</Label>
                      <p className="text-sm text-gray-500">Automatically track nutrition from planned meals</p>
                    </div>
                    <Switch
                      id="automaticNutritionTracking"
                      checked={preferencesForm.watch("automaticNutritionTracking")}
                      onCheckedChange={(checked) => preferencesForm.setValue("automaticNutritionTracking", checked)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireApprovalForNewRecipes">Require Approval for New Recipes</Label>
                      <p className="text-sm text-gray-500">New recipes must be approved by an admin before being visible</p>
                    </div>
                    <Switch
                      id="requireApprovalForNewRecipes"
                      checked={preferencesForm.watch("requireApprovalForNewRecipes")}
                      onCheckedChange={(checked) => preferencesForm.setValue("requireApprovalForNewRecipes", checked)}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="budgetTracking">Budget Tracking</Label>
                      <p className="text-sm text-gray-500">Track grocery spending and set monthly budgets</p>
                    </div>
                    <Switch
                      id="budgetTracking"
                      checked={preferencesForm.watch("budgetTracking")}
                      onCheckedChange={(checked) => preferencesForm.setValue("budgetTracking", checked)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {preferencesForm.watch("budgetTracking") && (
                  <div className="space-y-2">
                    <Label htmlFor="monthlyBudget">Monthly Budget ({familyForm.watch("currency")})</Label>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      {...preferencesForm.register("monthlyBudget", { valueAsNumber: true })}
                      placeholder="Enter monthly budget"
                      disabled={!isAdmin}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Default Meal Plan Visibility</Label>
                  <Select
                    value={preferencesForm.watch("defaultMealPlanVisibility")}
                    onValueChange={(value) => preferencesForm.setValue("defaultMealPlanVisibility", value as any)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private - Only creator can see</SelectItem>
                      <SelectItem value="family">Family - All family members can see</SelectItem>
                      <SelectItem value="public">Public - Anyone can see</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                    {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Advanced family management options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Family ID</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Use this ID to reference your family in integrations or support requests
                    </p>
                    <div className="flex gap-2">
                      <Input value={currentFamily.id} readOnly className="font-mono" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(currentFamily.id.toString());
                          toast({ title: "Family ID copied to clipboard!" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Data Export</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Export all your family's data including recipes, meal plans, and shopping lists
                    </p>
                    <Button variant="outline">
                      Export Family Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-medium text-red-800 mb-2">Delete Family</h3>
                      <p className="text-sm text-red-700 mb-3">
                        Once you delete this family, there is no going back. This will permanently delete 
                        all recipes, meal plans, shopping lists, and remove all members.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Delete Family
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the "{currentFamily.name}" family
                              and remove all associated data including recipes, meal plans, and shopping lists.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                              Yes, delete family
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}