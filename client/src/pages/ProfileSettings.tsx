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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User, Settings, Bell, Shield, Trash2, Plus, X } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  preferredDifficulty: z.enum(["easy", "medium", "hard", "any"]),
  favoriteCuisine: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  mealReminders: z.boolean(),
  shoppingListUpdates: z.boolean(),
  achievementAlerts: z.boolean(),
  familyInvitations: z.boolean(),
});

const privacySchema = z.object({
  profileVisibility: z.enum(["public", "family", "private"]),
  shareRecipes: z.boolean(),
  shareMealPlans: z.boolean(),
  shareAchievements: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;
type PrivacyFormData = z.infer<typeof privacySchema>;

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newRestriction, setNewRestriction] = useState("");
  const [newAllergy, setNewAllergy] = useState("");

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/profile', user?.id],
    enabled: !!user?.id,
  });

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/preferences', user?.id],
    enabled: !!user?.id,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      cookingSkillLevel: profile?.cookingSkillLevel || "beginner",
      preferredDifficulty: profile?.preferredDifficulty || "easy",
      favoriteCuisine: profile?.favoriteCuisine || "",
      dietaryRestrictions: profile?.dietaryRestrictions || [],
      allergies: profile?.allergies || [],
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: preferences?.emailNotifications ?? true,
      pushNotifications: preferences?.pushNotifications ?? true,
      mealReminders: preferences?.mealReminders ?? true,
      shoppingListUpdates: preferences?.shoppingListUpdates ?? true,
      achievementAlerts: preferences?.achievementAlerts ?? true,
      familyInvitations: preferences?.familyInvitations ?? true,
    },
  });

  const privacyForm = useForm<PrivacyFormData>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      profileVisibility: preferences?.profileVisibility || "family",
      shareRecipes: preferences?.shareRecipes ?? true,
      shareMealPlans: preferences?.shareMealPlans ?? true,
      shareAchievements: preferences?.shareAchievements ?? true,
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest('/api/profile/update', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: NotificationFormData | PrivacyFormData) => {
      return await apiRequest('/api/preferences/update', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      toast({ title: "Preferences updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update preferences", variant: "destructive" });
    },
  });

  const addDietaryRestriction = () => {
    if (newRestriction.trim()) {
      const current = profileForm.getValues("dietaryRestrictions") || [];
      profileForm.setValue("dietaryRestrictions", [...current, newRestriction.trim()]);
      setNewRestriction("");
    }
  };

  const removeDietaryRestriction = (restriction: string) => {
    const current = profileForm.getValues("dietaryRestrictions") || [];
    profileForm.setValue("dietaryRestrictions", current.filter(r => r !== restriction));
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      const current = profileForm.getValues("allergies") || [];
      profileForm.setValue("allergies", [...current, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    const current = profileForm.getValues("allergies") || [];
    profileForm.setValue("allergies", current.filter(a => a !== allergy));
  };

  if (profileLoading || preferencesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="cooking">Cooking Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your basic profile information and bio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register("firstName")}
                      placeholder="Enter your first name"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-sm text-red-600">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...profileForm.register("lastName")}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                    placeholder="Enter your email"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...profileForm.register("bio")}
                    placeholder="Tell us about yourself and your cooking journey..."
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cooking">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cooking Preferences</CardTitle>
                <CardDescription>
                  Set your cooking skill level and preferences to get personalized recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cooking Skill Level</Label>
                      <Select
                        value={profileForm.watch("cookingSkillLevel")}
                        onValueChange={(value) => profileForm.setValue("cookingSkillLevel", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Recipe Difficulty</Label>
                      <Select
                        value={profileForm.watch("preferredDifficulty")}
                        onValueChange={(value) => profileForm.setValue("preferredDifficulty", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="any">Any Difficulty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favoriteCuisine">Favorite Cuisine</Label>
                    <Input
                      id="favoriteCuisine"
                      {...profileForm.register("favoriteCuisine")}
                      placeholder="e.g., Italian, Asian, Mediterranean"
                    />
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dietary Restrictions & Allergies</CardTitle>
                <CardDescription>
                  Help us filter recipes and suggest meals that work for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Dietary Restrictions</Label>
                  <div className="flex gap-2 mt-2 mb-3">
                    <Input
                      value={newRestriction}
                      onChange={(e) => setNewRestriction(e.target.value)}
                      placeholder="Add dietary restriction"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietaryRestriction())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addDietaryRestriction}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profileForm.watch("dietaryRestrictions") || []).map((restriction) => (
                      <Badge key={restriction} variant="secondary" className="flex items-center gap-1">
                        {restriction}
                        <button
                          type="button"
                          onClick={() => removeDietaryRestriction(restriction)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Allergies</Label>
                  <div className="flex gap-2 mt-2 mb-3">
                    <Input
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      placeholder="Add allergy"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addAllergy}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profileForm.watch("allergies") || []).map((allergy) => (
                      <Badge key={allergy} variant="destructive" className="flex items-center gap-1">
                        {allergy}
                        <button
                          type="button"
                          onClick={() => removeAllergy(allergy)}
                          className="ml-1 hover:text-red-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about app activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={notificationForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive email updates about your account</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationForm.watch("emailNotifications")}
                      onCheckedChange={(checked) => notificationForm.setValue("emailNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-gray-500">Receive browser notifications</p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={notificationForm.watch("pushNotifications")}
                      onCheckedChange={(checked) => notificationForm.setValue("pushNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mealReminders">Meal Reminders</Label>
                      <p className="text-sm text-gray-500">Get reminded about upcoming meals</p>
                    </div>
                    <Switch
                      id="mealReminders"
                      checked={notificationForm.watch("mealReminders")}
                      onCheckedChange={(checked) => notificationForm.setValue("mealReminders", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="shoppingListUpdates">Shopping List Updates</Label>
                      <p className="text-sm text-gray-500">Notifications when shopping lists are updated</p>
                    </div>
                    <Switch
                      id="shoppingListUpdates"
                      checked={notificationForm.watch("shoppingListUpdates")}
                      onCheckedChange={(checked) => notificationForm.setValue("shoppingListUpdates", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="achievementAlerts">Achievement Alerts</Label>
                      <p className="text-sm text-gray-500">Celebrate when you unlock new achievements</p>
                    </div>
                    <Switch
                      id="achievementAlerts"
                      checked={notificationForm.watch("achievementAlerts")}
                      onCheckedChange={(checked) => notificationForm.setValue("achievementAlerts", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="familyInvitations">Family Invitations</Label>
                      <p className="text-sm text-gray-500">Notifications about family group activities</p>
                    </div>
                    <Switch
                      id="familyInvitations"
                      checked={notificationForm.watch("familyInvitations")}
                      onCheckedChange={(checked) => notificationForm.setValue("familyInvitations", checked)}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                  {updatePreferencesMutation.isPending ? "Saving..." : "Save Notification Preferences"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control what information you share with your family and others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={privacyForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Profile Visibility</Label>
                    <Select
                      value={privacyForm.watch("profileVisibility")}
                      onValueChange={(value) => privacyForm.setValue("profileVisibility", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Anyone can see</SelectItem>
                        <SelectItem value="family">Family Only - Only family members</SelectItem>
                        <SelectItem value="private">Private - Only you</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="shareRecipes">Share Recipes</Label>
                        <p className="text-sm text-gray-500">Allow family members to see your saved recipes</p>
                      </div>
                      <Switch
                        id="shareRecipes"
                        checked={privacyForm.watch("shareRecipes")}
                        onCheckedChange={(checked) => privacyForm.setValue("shareRecipes", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="shareMealPlans">Share Meal Plans</Label>
                        <p className="text-sm text-gray-500">Allow family members to see your meal planning</p>
                      </div>
                      <Switch
                        id="shareMealPlans"
                        checked={privacyForm.watch("shareMealPlans")}
                        onCheckedChange={(checked) => privacyForm.setValue("shareMealPlans", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="shareAchievements">Share Achievements</Label>
                        <p className="text-sm text-gray-500">Let family members see your cooking achievements</p>
                      </div>
                      <Switch
                        id="shareAchievements"
                        checked={privacyForm.watch("shareAchievements")}
                        onCheckedChange={(checked) => privacyForm.setValue("shareAchievements", checked)}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                    {updatePreferencesMutation.isPending ? "Saving..." : "Save Privacy Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>

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
                    <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Once you delete your account, there is no going back. This will permanently delete your profile, 
                      recipes, meal plans, and remove you from all family groups.
                    </p>
                    <Button variant="destructive" size="sm">
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}