import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Star, Target, Flame, Users, ChefHat, Calendar, Award, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFamily } from "@/contexts/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Achievement, UserAchievement, UserStats, CookingStreak, Challenge } from "@shared/schema";

interface AchievementWithProgress extends Achievement {
  userProgress?: UserAchievement;
  isUnlocked: boolean;
  progressPercentage: number;
}

export default function Achievements() {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch user achievements
  const { data: userAchievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/achievements/user', user?.id],
    enabled: !!user?.id,
  });

  // Fetch all available achievements
  const { data: allAchievements = [], isLoading: allAchievementsLoading } = useQuery({
    queryKey: ['/api/achievements'],
  });

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/user-stats', user?.id, currentFamily?.id],
    enabled: !!user?.id && !!currentFamily?.id,
  });

  // Fetch cooking streaks
  const { data: cookingStreaks = [], isLoading: streaksLoading } = useQuery({
    queryKey: ['/api/cooking-streaks', user?.id, currentFamily?.id],
    enabled: !!user?.id && !!currentFamily?.id,
  });

  // Fetch active challenges
  const { data: activeChallenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ['/api/challenges/active'],
  });

  // Join challenge mutation
  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      return await apiRequest('/api/challenges/join', {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          userId: user?.id,
          familyId: currentFamily?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      toast({ title: "Challenge joined successfully!" });
    },
  });

  // Process achievements to include progress
  const processedAchievements: AchievementWithProgress[] = allAchievements.map((achievement: Achievement) => {
    const userProgress = userAchievements.find((ua: UserAchievement) => ua.achievementId === achievement.id);
    const isUnlocked = !!userProgress?.isCompleted;

    let progressPercentage = 0;
    if (userProgress) {
      progressPercentage = (userProgress.progress / userProgress.maxProgress) * 100;
    }

    return {
      ...achievement,
      userProgress,
      isUnlocked,
      progressPercentage: Math.min(100, progressPercentage),
    };
  });

  // Filter achievements by category
  const filteredAchievements = processedAchievements.filter(achievement => 
    selectedCategory === "all" || achievement.category === selectedCategory
  );

  // Group achievements by difficulty
  const achievementsByDifficulty = filteredAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.difficulty]) acc[achievement.difficulty] = [];
    acc[achievement.difficulty].push(achievement);
    return acc;
  }, {} as Record<string, AchievementWithProgress[]>);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cooking': return <ChefHat className="h-5 w-5" />;
      case 'planning': return <Calendar className="h-5 w-5" />;
      case 'nutrition': return <Target className="h-5 w-5" />;
      case 'social': return <Users className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const getStreakIcon = (streakType: string) => {
    switch (streakType) {
      case 'daily_cooking': return '🔥';
      case 'recipe_trying': return '✨';
      case 'meal_planning': return '📅';
      default: return '⭐';
    }
  };

  if (achievementsLoading || allAchievementsLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cooking Achievements</h1>
          <p className="text-gray-600 mt-2">Track your culinary journey and unlock new badges</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">
            {userStats?.totalPoints || 0} pts
          </div>
          <div className="text-sm text-gray-600">Level {userStats?.level || 1}</div>
        </div>
      </div>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'cooking', 'planning', 'nutrition', 'social'].map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>

          {/* Achievements by Difficulty */}
          {Object.entries(achievementsByDifficulty).map(([difficulty, achievements]) => (
            <div key={difficulty} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {difficulty} Achievements
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className={`relative ${
                      achievement.isUnlocked 
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(achievement.category)}
                          <Badge className={getDifficultyColor(achievement.difficulty)}>
                            {achievement.difficulty}
                          </Badge>
                        </div>
                        {achievement.isUnlocked ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Lock className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{achievement.name}</CardTitle>
                      <CardDescription>{achievement.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {!achievement.isUnlocked && achievement.userProgress && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{achievement.userProgress.progress}/{achievement.userProgress.maxProgress}</span>
                            </div>
                            <Progress value={achievement.progressPercentage} className="h-2" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-purple-600">
                            +{achievement.points} pts
                          </span>
                          {achievement.badgeIcon && (
                            <span className="text-2xl">{achievement.badgeIcon}</span>
                          )}
                        </div>
                        {achievement.isUnlocked && achievement.userProgress?.completedAt && (
                          <div className="text-xs text-green-600">
                            Completed {new Date(achievement.userProgress.completedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="streaks" className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            Cooking Streaks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cookingStreaks.map((streak: CookingStreak) => (
              <Card key={streak.id} className="text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">{getStreakIcon(streak.streakType)}</div>
                  <CardTitle className="capitalize">{streak.streakType.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-orange-500">
                        {streak.currentStreak}
                      </div>
                      <div className="text-sm text-gray-600">Current Streak</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {streak.longestStreak}
                      </div>
                      <div className="text-sm text-gray-600">Personal Best</div>
                    </div>
                    {streak.lastActivity && (
                      <div className="text-xs text-gray-500">
                        Last activity: {new Date(streak.lastActivity).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            Active Challenges
          </h2>
          {activeChallenges && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeChallenges.map((challenge: Challenge) => (
                <Card key={challenge.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{challenge.name}</CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {challenge.category}
                      </Badge>
                    </div>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Duration</span>
                        <span>
                          {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Difficulty</span>
                        <Badge className={getDifficultyColor(challenge.difficulty)}>
                          {challenge.difficulty}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-purple-600">
                          Rewards: {(challenge.rewards as any)?.points || 0} pts
                        </span>
                        <Button
                          onClick={() => joinChallengeMutation.mutate(challenge.id)}
                          disabled={joinChallengeMutation.isPending}
                          size="sm"
                        >
                          Join Challenge
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-500" />
            Your Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {userStats?.totalPoints || 0}
                </div>
                <div className="text-sm text-gray-600">Total Points</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {userStats?.recipesCooked || 0}
                </div>
                <div className="text-sm text-gray-600">Recipes Cooked</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {userStats?.mealsPlanned || 0}
                </div>
                <div className="text-sm text-gray-600">Meals Planned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {userStats?.achievementsUnlocked || 0}
                </div>
                <div className="text-sm text-gray-600">Achievements</div>
              </CardContent>
            </Card>
          </div>

          {userStats && (
            <Card>
              <CardHeader>
                <CardTitle>Cooking Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Skill Level</div>
                    <div className="font-semibold capitalize">{userStats.cookingSkillLevel}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Preferred Difficulty</div>
                    <div className="font-semibold capitalize">{userStats.preferredDifficulty}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Favorite Cuisine</div>
                    <div className="font-semibold">{userStats.favoriteCuisine || 'Not set'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}