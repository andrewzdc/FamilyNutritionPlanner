import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FamilyMember {
  id: number;
  userId: string;
  familyId: number;
  displayName: string | null;
  memberImageUrl: string | null;
  role: string;
  dietType: string | null;
  foodPreferences: string[] | null;
  allergies: string[] | null;
  favoriteFoods: string[] | null;
  createdAt: Date | null;
}

interface Family {
  id: number;
  name: string;
  description: string | null;
  familyImageUrl: string | null;
  timezone: string | null;
  currency: string | null;
  weekStartsOn: "sunday" | "monday" | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string;
}

export default function SimpleFamilySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMemberData, setNewMemberData] = useState({
    displayName: "",
    role: "member",
    dietType: "",
    allergies: "",
    foodPreferences: "",
    favoriteFoods: ""
  });

  // Get the first family for demo purposes
  const { data: families } = useQuery<Family[]>({
    queryKey: ["/api/families"]
  });

  const currentFamily = families?.[0];

  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/families", currentFamily?.id, "members"],
    enabled: !!currentFamily?.id
  });

  const addMemberMutation = useMutation({
    mutationFn: async (memberData: any) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          ...memberData,
          userId: `user_${Date.now()}`, // Generate a temporary user ID
          familyId: currentFamily?.id,
          allergies: memberData.allergies ? memberData.allergies.split(",").map((s: string) => s.trim()) : [],
          foodPreferences: memberData.foodPreferences ? memberData.foodPreferences.split(",").map((s: string) => s.trim()) : [],
          favoriteFoods: memberData.favoriteFoods ? memberData.favoriteFoods.split(",").map((s: string) => s.trim()) : []
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families", currentFamily?.id, "members"] });
      setNewMemberData({
        displayName: "",
        role: "member",
        dietType: "",
        allergies: "",
        foodPreferences: "",
        favoriteFoods: ""
      });
      toast({
        title: "Success",
        description: "Family member added successfully!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive"
      });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest(`/api/families/${currentFamily?.id}/members/${memberId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families", currentFamily?.id, "members"] });
      toast({
        title: "Success",
        description: "Family member removed successfully!"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove family member",
        variant: "destructive"
      });
    }
  });

  const handleAddMember = () => {
    if (!newMemberData.displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a display name",
        variant: "destructive"
      });
      return;
    }
    addMemberMutation.mutate(newMemberData);
  };

  if (!currentFamily) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Family Settings</h1>
          <p>No family found. Create a family first to manage members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Family Settings</h1>
      
      {/* Family Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentFamily.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {currentFamily.description || "Manage your family members and their preferences"}
          </p>
        </CardContent>
      </Card>

      {/* Add New Member */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Family Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={newMemberData.displayName}
                onChange={(e) => setNewMemberData({ ...newMemberData, displayName: e.target.value })}
                placeholder="Enter member name"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newMemberData.role} onValueChange={(value) => setNewMemberData({ ...newMemberData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dietType">Diet Type</Label>
              <Select value={newMemberData.dietType} onValueChange={(value) => setNewMemberData({ ...newMemberData, dietType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select diet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="pescatarian">Pescatarian</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                  <SelectItem value="paleo">Paleo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="allergies">Allergies (comma separated)</Label>
              <Input
                id="allergies"
                value={newMemberData.allergies}
                onChange={(e) => setNewMemberData({ ...newMemberData, allergies: e.target.value })}
                placeholder="e.g. nuts, dairy, shellfish"
              />
            </div>
            <div>
              <Label htmlFor="foodPreferences">Food Preferences (comma separated)</Label>
              <Input
                id="foodPreferences"
                value={newMemberData.foodPreferences}
                onChange={(e) => setNewMemberData({ ...newMemberData, foodPreferences: e.target.value })}
                placeholder="e.g. spicy, sweet, italian"
              />
            </div>
            <div>
              <Label htmlFor="favoriteFoods">Favorite Foods (comma separated)</Label>
              <Input
                id="favoriteFoods"
                value={newMemberData.favoriteFoods}
                onChange={(e) => setNewMemberData({ ...newMemberData, favoriteFoods: e.target.value })}
                placeholder="e.g. pizza, pasta, chocolate"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddMember}
            disabled={addMemberMutation.isPending}
            className="w-full md:w-auto"
          >
            {addMemberMutation.isPending ? "Adding..." : "Add Member"}
          </Button>
        </CardContent>
      </Card>

      {/* Family Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Family Members ({familyMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading family members...</p>
          ) : familyMembers.length === 0 ? (
            <p className="text-muted-foreground">No family members added yet. Add your first member above!</p>
          ) : (
            <div className="space-y-4">
              {familyMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{member.displayName || "Unnamed Member"}</h3>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                        {member.dietType && (
                          <Badge variant="outline">{member.dietType}</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {member.allergies && member.allergies.length > 0 && (
                          <div>
                            <span className="font-medium text-red-600">Allergies: </span>
                            <span>{member.allergies.join(", ")}</span>
                          </div>
                        )}
                        
                        {member.foodPreferences && member.foodPreferences.length > 0 && (
                          <div>
                            <span className="font-medium text-blue-600">Preferences: </span>
                            <span>{member.foodPreferences.join(", ")}</span>
                          </div>
                        )}
                        
                        {member.favoriteFoods && member.favoriteFoods.length > 0 && (
                          <div>
                            <span className="font-medium text-green-600">Favorites: </span>
                            <span>{member.favoriteFoods.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteMemberMutation.mutate(member.id)}
                        disabled={deleteMemberMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}