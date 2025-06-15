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
import { 
  Users, Settings, UserPlus, Crown, Shield, Trash2, Copy, Mail, Calendar, ShoppingCart, 
  MapPin, Plus, Edit, X, Camera, Clock, Globe, Home, Building, User, Upload, Link2
} from "lucide-react";

const familySchema = z.object({
  name: z.string().min(1, "Family name is required"),
  description: z.string().optional(),
  familyImageUrl: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  weekStartsOn: z.enum(["sunday", "monday"]),
});

const memberSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  memberImageUrl: z.string().optional(),
  role: z.enum(["admin", "member"]),
  dietType: z.string().optional(),
  foodPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  favoriteFoods: z.array(z.string()).optional(),
});

const addressSchema = z.object({
  addressType: z.enum(["home", "work", "other"]),
  label: z.string().optional(),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().default("US"),
  isDefault: z.boolean().default(false),
});

const mealTimeSchema = z.object({
  mealName: z.string().min(1, "Meal name is required"),
  defaultTime: z.string().optional(),
  daysOfWeek: z.array(z.string()),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const shoppingSiteSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteUrl: z.string().optional(),
  accountEmail: z.string().email().optional().or(z.literal("")),
  deliveryPreferences: z.object({
    preferredDeliveryWindow: z.string().optional(),
    specialInstructions: z.string().optional(),
    contactPhone: z.string().optional(),
  }).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FamilyFormData = z.infer<typeof familySchema>;
type MemberFormData = z.infer<typeof memberSchema>;
type AddressFormData = z.infer<typeof addressSchema>;
type MealTimeFormData = z.infer<typeof mealTimeSchema>;
type ShoppingSiteFormData = z.infer<typeof shoppingSiteSchema>;

export default function EnhancedFamilySettings() {
  const { currentFamily, setCurrentFamily } = useFamily();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [editingMealTime, setEditingMealTime] = useState<any>(null);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [mealTimeDialogOpen, setMealTimeDialogOpen] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);

  // Fetch family data
  const { data: familyMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'members'],
    enabled: !!currentFamily?.id,
  });

  const { data: familyAddresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'addresses'],
    enabled: !!currentFamily?.id,
  });

  const { data: familyMealTimes = [], isLoading: mealTimesLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'meal-times'],
    enabled: !!currentFamily?.id,
  });

  const { data: shoppingSites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['/api/families', currentFamily?.id, 'shopping-sites'],
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
      familyImageUrl: currentFamily?.familyImageUrl || "",
      timezone: currentFamily?.timezone || "America/New_York",
      currency: currentFamily?.currency || "USD",
      weekStartsOn: currentFamily?.weekStartsOn || "sunday",
    },
  });

  const memberForm = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      displayName: "",
      memberImageUrl: "",
      role: "member",
      dietType: "",
      foodPreferences: [],
      allergies: [],
      favoriteFoods: [],
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressType: "home",
      label: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      isDefault: false,
    },
  });

  const mealTimeForm = useForm<MealTimeFormData>({
    resolver: zodResolver(mealTimeSchema),
    defaultValues: {
      mealName: "",
      defaultTime: "",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      isActive: true,
      sortOrder: 0,
    },
  });

  const siteForm = useForm<ShoppingSiteFormData>({
    resolver: zodResolver(shoppingSiteSchema),
    defaultValues: {
      siteName: "",
      siteUrl: "",
      accountEmail: "",
      deliveryPreferences: {
        preferredDeliveryWindow: "",
        specialInstructions: "",
        contactPhone: "",
      },
      isDefault: false,
      isActive: true,
    },
  });

  // Mutations
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
      toast({ title: "Family information updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update family information", variant: "destructive" });
    },
  });

  const saveMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const url = editingMember 
        ? `/api/families/${currentFamily?.id}/members/${editingMember.id}`
        : `/api/families/${currentFamily?.id}/members`;
      const method = editingMember ? 'PATCH' : 'POST';
      
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'members'] });
      toast({ title: editingMember ? "Member updated successfully!" : "Member added successfully!" });
      setMemberDialogOpen(false);
      setEditingMember(null);
      memberForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save member", variant: "destructive" });
    },
  });

  const saveAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const url = editingAddress 
        ? `/api/families/${currentFamily?.id}/addresses/${editingAddress.id}`
        : `/api/families/${currentFamily?.id}/addresses`;
      const method = editingAddress ? 'PATCH' : 'POST';
      
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'addresses'] });
      toast({ title: editingAddress ? "Address updated successfully!" : "Address added successfully!" });
      setAddressDialogOpen(false);
      setEditingAddress(null);
      addressForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save address", variant: "destructive" });
    },
  });

  const saveMealTimeMutation = useMutation({
    mutationFn: async (data: MealTimeFormData) => {
      const url = editingMealTime 
        ? `/api/families/${currentFamily?.id}/meal-times/${editingMealTime.id}`
        : `/api/families/${currentFamily?.id}/meal-times`;
      const method = editingMealTime ? 'PATCH' : 'POST';
      
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'meal-times'] });
      toast({ title: editingMealTime ? "Meal time updated successfully!" : "Meal time added successfully!" });
      setMealTimeDialogOpen(false);
      setEditingMealTime(null);
      mealTimeForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save meal time", variant: "destructive" });
    },
  });

  const saveSiteMutation = useMutation({
    mutationFn: async (data: ShoppingSiteFormData) => {
      const url = editingSite 
        ? `/api/families/${currentFamily?.id}/shopping-sites/${editingSite.id}`
        : `/api/families/${currentFamily?.id}/shopping-sites`;
      const method = editingSite ? 'PATCH' : 'POST';
      
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, 'shopping-sites'] });
      toast({ title: editingSite ? "Shopping site updated successfully!" : "Shopping site added successfully!" });
      setSiteDialogOpen(false);
      setEditingSite(null);
      siteForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to save shopping site", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/${type}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/families', currentFamily?.id, type] });
      toast({ title: "Item deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    },
  });

  const openMemberDialog = (member?: any) => {
    if (member) {
      setEditingMember(member);
      memberForm.reset({
        displayName: member.displayName || "",
        memberImageUrl: member.memberImageUrl || "",
        role: member.role || "member",
        dietType: member.dietType || "",
        foodPreferences: member.foodPreferences || [],
        allergies: member.allergies || [],
        favoriteFoods: member.favoriteFoods || [],
      });
    } else {
      setEditingMember(null);
      memberForm.reset();
    }
    setMemberDialogOpen(true);
  };

  const openAddressDialog = (address?: any) => {
    if (address) {
      setEditingAddress(address);
      addressForm.reset(address);
    } else {
      setEditingAddress(null);
      addressForm.reset();
    }
    setAddressDialogOpen(true);
  };

  const openMealTimeDialog = (mealTime?: any) => {
    if (mealTime) {
      setEditingMealTime(mealTime);
      mealTimeForm.reset(mealTime);
    } else {
      setEditingMealTime(null);
      mealTimeForm.reset();
    }
    setMealTimeDialogOpen(true);
  };

  const openSiteDialog = (site?: any) => {
    if (site) {
      setEditingSite(site);
      siteForm.reset(site);
    } else {
      setEditingSite(null);
      siteForm.reset();
    }
    setSiteDialogOpen(true);
  };

  if (membersLoading || addressesLoading || mealTimesLoading || sitesLoading) {
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Management</h1>
          <p className="text-gray-600">Comprehensive family settings and member management</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="mealtimes">Meal Times</TabsTrigger>
          <TabsTrigger value="shopping">Shopping</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Family Profile
              </CardTitle>
              <CardDescription>
                Manage your family's basic information and photo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={familyForm.handleSubmit((data) => updateFamilyMutation.mutate(data))} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={familyForm.watch("familyImageUrl")} />
                      <AvatarFallback className="text-2xl">
                        {currentFamily.name?.[0] || 'F'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <Button type="button" variant="outline" size="sm">
                        <Link2 className="h-4 w-4 mr-2" />
                        Add URL
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="familyImageUrl">Family Photo URL</Label>
                      <Input
                        id="familyImageUrl"
                        {...familyForm.register("familyImageUrl")}
                        placeholder="https://example.com/family-photo.jpg"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Family Members ({familyMembers.length})
                </div>
                {isAdmin && (
                  <Button onClick={() => openMemberDialog()}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map((member: any) => (
                  <Card key={member.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={member.memberImageUrl} />
                        <AvatarFallback>
                          {member.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.displayName}</span>
                          {member.userId === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {member.role === 'admin' ? (
                            <Crown className="h-3 w-3 text-yellow-600" />
                          ) : (
                            <User className="h-3 w-3 text-blue-600" />
                          )}
                          <span className="text-sm text-gray-600 capitalize">{member.role}</span>
                        </div>
                      </div>
                    </div>
                    
                    {member.dietType && (
                      <div className="mb-2">
                        <Badge variant="secondary">{member.dietType}</Badge>
                      </div>
                    )}
                    
                    {member.allergies && member.allergies.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Allergies:</p>
                        <div className="flex flex-wrap gap-1">
                          {member.allergies.slice(0, 3).map((allergy: string) => (
                            <Badge key={allergy} variant="destructive" className="text-xs">
                              {allergy}
                            </Badge>
                          ))}
                          {member.allergies.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.allergies.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {isAdmin && member.userId !== user?.id && (
                      <div className="flex gap-1 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openMemberDialog(member)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.displayName} from the family?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteMutation.mutate({ type: 'members', id: member.id })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Family Addresses ({familyAddresses.length})
                </div>
                {isAdmin && (
                  <Button onClick={() => openAddressDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyAddresses.map((address: any) => (
                  <Card key={address.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {address.addressType === 'home' && <Home className="h-4 w-4 text-blue-600" />}
                          {address.addressType === 'work' && <Building className="h-4 w-4 text-gray-600" />}
                          {address.addressType === 'other' && <MapPin className="h-4 w-4 text-green-600" />}
                          <span className="font-medium capitalize">{address.addressType}</span>
                          {address.label && <span className="text-gray-600">- {address.label}</span>}
                          {address.isDefault && <Badge variant="default" className="text-xs">Default</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">
                          {address.street}<br />
                          {address.city}, {address.state} {address.zipCode}<br />
                          {address.country}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openAddressDialog(address)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Address</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this address?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ type: 'addresses', id: address.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Address
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mealtimes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Meal Times ({familyMealTimes.length})
                </div>
                {isAdmin && (
                  <Button onClick={() => openMealTimeDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meal Time
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Customize your family's meal schedule and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMealTimes.map((mealTime: any) => (
                  <Card key={mealTime.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">{mealTime.mealName}</span>
                          {mealTime.defaultTime && (
                            <Badge variant="secondary">{mealTime.defaultTime}</Badge>
                          )}
                          {!mealTime.isActive && (
                            <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                          )}
                        </div>
                        {mealTime.daysOfWeek && mealTime.daysOfWeek.length > 0 && (
                          <p className="text-sm text-gray-600">
                            Days: {mealTime.daysOfWeek.map((day: string) => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ')}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openMealTimeDialog(mealTime)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Meal Time</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {mealTime.mealName}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ type: 'meal-times', id: mealTime.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Meal Time
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopping">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping Sites ({shoppingSites.length})
                </div>
                {isAdmin && (
                  <Button onClick={() => openSiteDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shopping Site
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Manage your preferred grocery delivery and shopping services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shoppingSites.map((site: any) => (
                  <Card key={site.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{site.siteName}</span>
                          {site.isDefault && <Badge variant="default" className="text-xs">Default</Badge>}
                          {!site.isActive && <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
                        </div>
                        {site.siteUrl && (
                          <p className="text-sm text-blue-600 mb-1">{site.siteUrl}</p>
                        )}
                        {site.accountEmail && (
                          <p className="text-sm text-gray-600 mb-1">Account: {site.accountEmail}</p>
                        )}
                        {site.deliveryPreferences?.preferredDeliveryWindow && (
                          <p className="text-sm text-gray-600">
                            Delivery: {site.deliveryPreferences.preferredDeliveryWindow}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openSiteDialog(site)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Shopping Site</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {site.siteName}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate({ type: 'shopping-sites', id: site.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Site
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Family Preferences
              </CardTitle>
              <CardDescription>
                Configure family-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Shared Shopping Lists</Label>
                      <p className="text-sm text-gray-500">Allow all family members to view and edit shopping lists</p>
                    </div>
                    <Switch disabled={!isAdmin} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Shared Meal Planning</Label>
                      <p className="text-sm text-gray-500">Enable collaborative meal planning for all family members</p>
                    </div>
                    <Switch disabled={!isAdmin} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Achievement System</Label>
                      <p className="text-sm text-gray-500">Track cooking achievements and progress for family members</p>
                    </div>
                    <Switch disabled={!isAdmin} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Budget Tracking</Label>
                      <p className="text-sm text-gray-500">Track grocery spending and set monthly budgets</p>
                    </div>
                    <Switch disabled={!isAdmin} />
                  </div>
                </div>

                {isAdmin && (
                  <Button>
                    Save Preferences
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add Family Member'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Update member information and preferences' : 'Add a new member to your family'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={memberForm.handleSubmit((data) => saveMemberMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...memberForm.register("displayName")}
                  placeholder="Enter display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={memberForm.watch("role")}
                  onValueChange={(value) => memberForm.setValue("role", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberImageUrl">Photo URL</Label>
              <Input
                id="memberImageUrl"
                {...memberForm.register("memberImageUrl")}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietType">Diet Type</Label>
              <Input
                id="dietType"
                {...memberForm.register("dietType")}
                placeholder="e.g., Vegetarian, Vegan, Keto"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMemberMutation.isPending}>
                {saveMemberMutation.isPending ? "Saving..." : editingMember ? "Update Member" : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addressForm.handleSubmit((data) => saveAddressMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address Type</Label>
                <Select
                  value={addressForm.watch("addressType")}
                  onValueChange={(value) => addressForm.setValue("addressType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  {...addressForm.register("label")}
                  placeholder="e.g., Main House"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                {...addressForm.register("street")}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...addressForm.register("city")}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  {...addressForm.register("state")}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  {...addressForm.register("zipCode")}
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={addressForm.watch("isDefault")}
                onCheckedChange={(checked) => addressForm.setValue("isDefault", checked)}
              />
              <Label>Set as default address</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveAddressMutation.isPending}>
                {saveAddressMutation.isPending ? "Saving..." : editingAddress ? "Update Address" : "Add Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meal Time Dialog */}
      <Dialog open={mealTimeDialogOpen} onOpenChange={setMealTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMealTime ? 'Edit Meal Time' : 'Add Meal Time'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={mealTimeForm.handleSubmit((data) => saveMealTimeMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mealName">Meal Name</Label>
                <Input
                  id="mealName"
                  {...mealTimeForm.register("mealName")}
                  placeholder="e.g., Breakfast, Lunch, Dinner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTime">Default Time</Label>
                <Input
                  id="defaultTime"
                  type="time"
                  {...mealTimeForm.register("defaultTime")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-4 gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Switch
                      checked={mealTimeForm.watch("daysOfWeek")?.includes(day)}
                      onCheckedChange={(checked) => {
                        const current = mealTimeForm.watch("daysOfWeek") || [];
                        if (checked) {
                          mealTimeForm.setValue("daysOfWeek", [...current, day]);
                        } else {
                          mealTimeForm.setValue("daysOfWeek", current.filter(d => d !== day));
                        }
                      }}
                    />
                    <Label className="text-sm capitalize">{day.slice(0, 3)}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={mealTimeForm.watch("isActive")}
                onCheckedChange={(checked) => mealTimeForm.setValue("isActive", checked)}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMealTimeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMealTimeMutation.isPending}>
                {saveMealTimeMutation.isPending ? "Saving..." : editingMealTime ? "Update Meal Time" : "Add Meal Time"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shopping Site Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Edit Shopping Site' : 'Add Shopping Site'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={siteForm.handleSubmit((data) => saveSiteMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                {...siteForm.register("siteName")}
                placeholder="e.g., Instacart, Amazon Fresh, Kroger"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteUrl">Website URL (optional)</Label>
              <Input
                id="siteUrl"
                {...siteForm.register("siteUrl")}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountEmail">Account Email (optional)</Label>
              <Input
                id="accountEmail"
                type="email"
                {...siteForm.register("accountEmail")}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredDeliveryWindow">Preferred Delivery Window</Label>
              <Input
                id="preferredDeliveryWindow"
                {...siteForm.register("deliveryPreferences.preferredDeliveryWindow")}
                placeholder="e.g., Morning, Evening, Weekends"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                {...siteForm.register("deliveryPreferences.specialInstructions")}
                placeholder="Delivery instructions, gate codes, etc."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={siteForm.watch("isDefault")}
                onCheckedChange={(checked) => siteForm.setValue("isDefault", checked)}
              />
              <Label>Set as default shopping site</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSiteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSiteMutation.isPending}>
                {saveSiteMutation.isPending ? "Saving..." : editingSite ? "Update Site" : "Add Site"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}