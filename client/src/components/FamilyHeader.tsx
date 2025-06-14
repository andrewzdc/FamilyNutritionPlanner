import { useQuery } from "@tanstack/react-query";
import { useFamily } from "@/contexts/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import type { FamilyMembership } from "@shared/schema";

export default function FamilyHeader() {
  const { currentFamily } = useFamily();

  const { data: members = [] } = useQuery<FamilyMembership[]>({
    queryKey: ['/api/families', currentFamily?.id, 'members'],
    enabled: !!currentFamily?.id,
  });

  if (!currentFamily) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{currentFamily.name}</h2>
            <p className="text-gray-600 mt-1">
              {members.length} members • Next meal: Tonight's Dinner
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
        
        {/* Family Members */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {members.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No family members added yet</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <span className="text-primary font-semibold text-lg">
                    {member.displayName?.[0] || 'M'}
                  </span>
                </div>
                <span className="font-medium text-gray-900 text-sm">
                  {member.displayName || 'Member'}
                </span>
                <span className="text-xs text-gray-500">
                  {member.role} • {member.allergies?.length ? member.allergies.join(', ') : 'No restrictions'}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
