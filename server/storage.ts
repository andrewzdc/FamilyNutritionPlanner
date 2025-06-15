import {
  users,
  families,
  familyMemberships,
  recipes,
  mealTypes,
  meals,
  nutritionLogs,
  shoppingLists,
  shoppingListItems,
  pantryItems,
  restaurantOrders,
  achievements,
  userAchievements,
  cookingStreaks,
  challenges,
  challengeParticipants,
  userStats,
  type User,
  type UpsertUser,
  type InsertFamily,
  type Family,
  type InsertFamilyMembership,
  type FamilyMembership,
  type InsertRecipe,
  type Recipe,
  type MealType,
  type InsertMeal,
  type Meal,
  type InsertNutritionLog,
  type NutritionLog,
  type InsertShoppingList,
  type ShoppingList,
  type InsertShoppingListItem,
  type ShoppingListItem,
  type InsertPantryItem,
  type PantryItem,
  type InsertRestaurantOrder,
  type RestaurantOrder,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type CookingStreak,
  type InsertCookingStreak,
  type Challenge,
  type InsertChallenge,
  type ChallengeParticipant,
  type InsertChallengeParticipant,
  type UserStats,
  type InsertUserStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Family operations
  createFamily(family: InsertFamily): Promise<Family>;
  getFamiliesByUserId(userId: string): Promise<Family[]>;
  getFamilyById(id: number): Promise<Family | undefined>;
  
  // Family membership operations
  addFamilyMember(membership: InsertFamilyMembership): Promise<FamilyMembership>;
  getFamilyMembers(familyId: number): Promise<FamilyMembership[]>;
  getUserFamilyMembership(userId: string, familyId: number): Promise<FamilyMembership | undefined>;
  
  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipesByFamilyId(familyId: number): Promise<Recipe[]>;
  getRecipeById(id: number): Promise<Recipe | undefined>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<boolean>;
  
  // Meal type operations
  getMealTypes(): Promise<MealType[]>;
  
  // Meal operations
  createMeal(meal: InsertMeal): Promise<Meal>;
  getMealById(id: number): Promise<Meal | undefined>;
  getMealsByFamilyId(familyId: number): Promise<Meal[]>;
  getMealsByDateRange(familyId: number, startDate: string, endDate: string): Promise<Meal[]>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<boolean>;
  
  // Nutrition log operations
  createNutritionLog(log: InsertNutritionLog): Promise<NutritionLog>;
  getNutritionLogsByUserId(userId: string, date?: string): Promise<NutritionLog[]>;
  
  // Shopping list operations
  createShoppingList(list: InsertShoppingList): Promise<ShoppingList>;
  getShoppingListsByFamilyId(familyId: number): Promise<ShoppingList[]>;
  getShoppingListById(id: number): Promise<ShoppingList | undefined>;
  updateShoppingList(id: number, list: Partial<InsertShoppingList>): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: number): Promise<boolean>;
  
  // Shopping list item operations
  addShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  getShoppingListItems(shoppingListId: number): Promise<ShoppingListItem[]>;
  updateShoppingListItem(id: number, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined>;
  deleteShoppingListItem(id: number): Promise<boolean>;
  
  // Restaurant order operations
  createRestaurantOrder(order: InsertRestaurantOrder): Promise<RestaurantOrder>;
  getRestaurantOrdersByFamilyId(familyId: number): Promise<RestaurantOrder[]>;
  getRestaurantOrderById(id: number): Promise<RestaurantOrder | undefined>;
  
  // Pantry operations
  createPantryItem(item: InsertPantryItem): Promise<PantryItem>;
  getPantryItemsByFamilyId(familyId: number): Promise<PantryItem[]>;
  updatePantryItem(id: number, item: Partial<InsertPantryItem>): Promise<PantryItem | undefined>;
  deletePantryItem(id: number): Promise<boolean>;
  
  // Advanced shopping list operations
  generateShoppingListFromMeals(familyId: number, mealIds: number[]): Promise<{ consolidatedIngredients: any[], existingPantryItems: PantryItem[] }>;
  getShoppingListItemHistory(familyId: number, itemName: string): Promise<ShoppingListItem[]>;
  bulkUpdateShoppingListItems(updates: { id: number; updates: Partial<InsertShoppingListItem> }[]): Promise<ShoppingListItem[]>;
  
  // Gamification operations
  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievementProgress(id: number, progress: number): Promise<UserAchievement | undefined>;
  completeUserAchievement(id: number): Promise<UserAchievement | undefined>;
  
  getUserStats(userId: string, familyId: number): Promise<UserStats | undefined>;
  createOrUpdateUserStats(stats: InsertUserStats): Promise<UserStats>;
  incrementUserStat(userId: string, familyId: number, stat: keyof UserStats, amount: number): Promise<void>;
  
  getCookingStreaks(userId: string, familyId: number): Promise<CookingStreak[]>;
  updateCookingStreak(userId: string, familyId: number, streakType: string): Promise<CookingStreak>;
  
  getActiveChallenges(): Promise<Challenge[]>;
  getChallengeParticipants(challengeId: number): Promise<ChallengeParticipant[]>;
  joinChallenge(data: InsertChallengeParticipant): Promise<ChallengeParticipant>;
  updateChallengeProgress(participantId: number, progress: any): Promise<ChallengeParticipant | undefined>;
  
  checkAndAwardAchievements(userId: string, familyId: number, action: string): Promise<UserAchievement[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Family operations
  async createFamily(family: InsertFamily): Promise<Family> {
    const [newFamily] = await db.insert(families).values(family).returning();
    return newFamily;
  }

  async getFamiliesByUserId(userId: string): Promise<Family[]> {
    const result = await db
      .select({
        id: families.id,
        name: families.name,
        createdBy: families.createdBy,
        createdAt: families.createdAt,
        updatedAt: families.updatedAt,
      })
      .from(families)
      .innerJoin(familyMemberships, eq(families.id, familyMemberships.familyId))
      .where(eq(familyMemberships.userId, userId));
    
    return result;
  }

  async getFamilyById(id: number): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family;
  }

  // Family membership operations
  async addFamilyMember(membership: InsertFamilyMembership): Promise<FamilyMembership> {
    const [newMembership] = await db.insert(familyMemberships).values(membership).returning();
    return newMembership;
  }

  async getFamilyMembers(familyId: number): Promise<FamilyMembership[]> {
    return await db
      .select()
      .from(familyMemberships)
      .where(eq(familyMemberships.familyId, familyId));
  }

  async getUserFamilyMembership(userId: string, familyId: number): Promise<FamilyMembership | undefined> {
    const [membership] = await db
      .select()
      .from(familyMemberships)
      .where(and(eq(familyMemberships.userId, userId), eq(familyMemberships.familyId, familyId)));
    return membership;
  }

  // Recipe operations
  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db.insert(recipes).values(recipe).returning();
    return newRecipe;
  }

  async getRecipesByFamilyId(familyId: number): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .where(eq(recipes.familyId, familyId))
      .orderBy(desc(recipes.createdAt));
  }

  async getRecipeById(id: number): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe;
  }

  async deleteRecipe(id: number): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return result.rowCount > 0;
  }

  // Meal type operations
  async getMealTypes(): Promise<MealType[]> {
    return await db.select().from(mealTypes).orderBy(asc(mealTypes.displayOrder));
  }

  // Meal operations
  async createMeal(meal: InsertMeal): Promise<Meal> {
    const [newMeal] = await db.insert(meals).values(meal).returning();
    return newMeal;
  }

  async getMealById(id: number): Promise<Meal | undefined> {
    const [meal] = await db
      .select()
      .from(meals)
      .where(eq(meals.id, id));
    return meal || undefined;
  }

  async getMealsByFamilyId(familyId: number): Promise<Meal[]> {
    return await db
      .select()
      .from(meals)
      .where(eq(meals.familyId, familyId))
      .orderBy(desc(meals.scheduledDate));
  }

  async getMealsByDateRange(familyId: number, startDate: string, endDate: string): Promise<Meal[]> {
    return await db
      .select()
      .from(meals)
      .where(
        and(
          eq(meals.familyId, familyId),
          eq(meals.scheduledDate, startDate),
          eq(meals.scheduledDate, endDate)
        )
      )
      .orderBy(asc(meals.scheduledDate));
  }

  async updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined> {
    const [updatedMeal] = await db
      .update(meals)
      .set(meal)
      .where(eq(meals.id, id))
      .returning();
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<boolean> {
    const result = await db.delete(meals).where(eq(meals.id, id));
    return result.rowCount > 0;
  }

  // Nutrition log operations
  async createNutritionLog(log: InsertNutritionLog): Promise<NutritionLog> {
    const [newLog] = await db.insert(nutritionLogs).values(log).returning();
    return newLog;
  }

  async getNutritionLogsByUserId(userId: string, date?: string): Promise<NutritionLog[]> {
    const conditions = [eq(nutritionLogs.userId, userId)];
    if (date) {
      conditions.push(eq(nutritionLogs.loggedDate, date));
    }
    
    return await db
      .select()
      .from(nutritionLogs)
      .where(and(...conditions))
      .orderBy(desc(nutritionLogs.createdAt));
  }

  // Shopping list operations
  async createShoppingList(list: InsertShoppingList): Promise<ShoppingList> {
    const [newList] = await db.insert(shoppingLists).values(list).returning();
    return newList;
  }

  async getShoppingListsByFamilyId(familyId: number): Promise<ShoppingList[]> {
    return await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.familyId, familyId))
      .orderBy(desc(shoppingLists.createdAt));
  }

  async getShoppingListById(id: number): Promise<ShoppingList | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    return list;
  }

  async updateShoppingList(id: number, list: Partial<InsertShoppingList>): Promise<ShoppingList | undefined> {
    const [updatedList] = await db
      .update(shoppingLists)
      .set({ ...list, updatedAt: new Date() })
      .where(eq(shoppingLists.id, id))
      .returning();
    return updatedList;
  }

  async deleteShoppingList(id: number): Promise<boolean> {
    const result = await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
    return result.rowCount > 0;
  }

  // Shopping list item operations
  async addShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [newItem] = await db.insert(shoppingListItems).values(item).returning();
    return newItem;
  }

  async getShoppingListItems(shoppingListId: number): Promise<ShoppingListItem[]> {
    return await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingListId))
      .orderBy(asc(shoppingListItems.createdAt));
  }

  async updateShoppingListItem(id: number, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const [updatedItem] = await db
      .update(shoppingListItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(shoppingListItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteShoppingListItem(id: number): Promise<boolean> {
    const result = await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
    return result.rowCount > 0;
  }

  // Restaurant order operations
  async createRestaurantOrder(order: InsertRestaurantOrder): Promise<RestaurantOrder> {
    const [newOrder] = await db.insert(restaurantOrders).values(order).returning();
    return newOrder;
  }

  async getRestaurantOrdersByFamilyId(familyId: number): Promise<RestaurantOrder[]> {
    return await db
      .select()
      .from(restaurantOrders)
      .where(eq(restaurantOrders.familyId, familyId))
      .orderBy(desc(restaurantOrders.orderDate));
  }

  async getRestaurantOrderById(id: number): Promise<RestaurantOrder | undefined> {
    const [order] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, id));
    return order;
  }

  // Pantry operations
  async createPantryItem(item: InsertPantryItem): Promise<PantryItem> {
    const [pantryItem] = await db
      .insert(pantryItems)
      .values(item)
      .returning();
    return pantryItem;
  }

  async getPantryItemsByFamilyId(familyId: number): Promise<PantryItem[]> {
    return await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.familyId, familyId))
      .orderBy(asc(pantryItems.name));
  }

  async updatePantryItem(id: number, item: Partial<InsertPantryItem>): Promise<PantryItem | undefined> {
    const [pantryItem] = await db
      .update(pantryItems)
      .set(item)
      .where(eq(pantryItems.id, id))
      .returning();
    return pantryItem;
  }

  async deletePantryItem(id: number): Promise<boolean> {
    const result = await db
      .delete(pantryItems)
      .where(eq(pantryItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Advanced shopping list operations
  async generateShoppingListFromMeals(familyId: number, mealIds: number[]): Promise<{ consolidatedIngredients: any[], existingPantryItems: PantryItem[] }> {
    // Get all meals and their recipes
    const mealList = await db
      .select()
      .from(meals)
      .where(and(
        eq(meals.familyId, familyId),
        // TODO: Add proper SQL IN operator for mealIds
      ));

    // Get all recipes for these meals
    const recipeIds = mealList.map(meal => meal.recipeId);
    const recipeList = await db
      .select()
      .from(recipes)
      .where(eq(recipes.familyId, familyId));

    // Get existing pantry items
    const existingPantryItems = await this.getPantryItemsByFamilyId(familyId);

    // Consolidate ingredients from recipes
    const consolidatedIngredients: any[] = [];
    for (const meal of mealList) {
      const recipe = recipeList.find(r => r.id === meal.recipeId);
      if (recipe && recipe.ingredients) {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        for (const ingredient of ingredients) {
          const existing = consolidatedIngredients.find(i => i.name === ingredient);
          if (existing) {
            // TODO: Add quantity consolidation logic
          } else {
            consolidatedIngredients.push({
              name: ingredient,
              quantity: "1",
              unit: "serving",
              category: "Recipe Ingredient",
              sourceType: "recipe",
              sourceId: recipe.id,
              priority: 2
            });
          }
        }
      }
    }

    return { consolidatedIngredients, existingPantryItems };
  }

  async getShoppingListItemHistory(familyId: number, itemName: string): Promise<ShoppingListItem[]> {
    const familyShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.familyId, familyId));

    const listIds = familyShoppingLists.map(list => list.id);
    
    // Get items with matching name from family's shopping lists
    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.name, itemName))
      .orderBy(desc(shoppingListItems.createdAt));

    return items.filter(item => listIds.includes(item.shoppingListId));
  }

  async bulkUpdateShoppingListItems(updates: { id: number; updates: Partial<InsertShoppingListItem> }[]): Promise<ShoppingListItem[]> {
    const updatedItems: ShoppingListItem[] = [];
    
    for (const update of updates) {
      const [item] = await db
        .update(shoppingListItems)
        .set(update.updates)
        .where(eq(shoppingListItems.id, update.id))
        .returning();
      
      if (item) {
        updatedItems.push(item);
      }
    }
    
    return updatedItems;
  }

  // Gamification operations
  async getAllAchievements(): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(asc(achievements.category), asc(achievements.difficulty));
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.createdAt));
  }

  async createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement> {
    const [userAchievement] = await db
      .insert(userAchievements)
      .values(achievement)
      .returning();
    return userAchievement;
  }

  async updateUserAchievementProgress(id: number, progress: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db
      .update(userAchievements)
      .set({ progress })
      .where(eq(userAchievements.id, id))
      .returning();
    return userAchievement;
  }

  async completeUserAchievement(id: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db
      .update(userAchievements)
      .set({ 
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(userAchievements.id, id))
      .returning();
    return userAchievement;
  }

  async getUserStats(userId: string, familyId: number): Promise<UserStats | undefined> {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(and(
        eq(userStats.userId, userId),
        eq(userStats.familyId, familyId)
      ));
    return stats;
  }

  async createOrUpdateUserStats(stats: InsertUserStats): Promise<UserStats> {
    const existing = await this.getUserStats(stats.userId, stats.familyId);
    
    if (existing) {
      const [updated] = await db
        .update(userStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(and(
          eq(userStats.userId, stats.userId),
          eq(userStats.familyId, stats.familyId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userStats)
        .values(stats)
        .returning();
      return created;
    }
  }

  async incrementUserStat(userId: string, familyId: number, stat: keyof UserStats, amount: number): Promise<void> {
    const existing = await this.getUserStats(userId, familyId);
    
    if (existing) {
      const currentValue = (existing[stat] as number) || 0;
      const updates: Partial<UserStats> = {
        [stat]: currentValue + amount,
        updatedAt: new Date()
      };
      
      await db
        .update(userStats)
        .set(updates)
        .where(and(
          eq(userStats.userId, userId),
          eq(userStats.familyId, familyId)
        ));
    } else {
      const newStats: InsertUserStats = {
        userId,
        familyId,
        [stat]: amount
      };
      await this.createOrUpdateUserStats(newStats);
    }
  }

  async getCookingStreaks(userId: string, familyId: number): Promise<CookingStreak[]> {
    console.log(userId, familyId);
    return await db
      .select()
      .from(cookingStreaks)
      .where(and(
        eq(cookingStreaks.userId, userId),
        eq(cookingStreaks.familyId, familyId)
      ));
  }

  async updateCookingStreak(userId: string, familyId: number, streakType: string): Promise<CookingStreak> {
    const [existing] = await db
      .select()
      .from(cookingStreaks)
      .where(and(
        eq(cookingStreaks.userId, userId),
        eq(cookingStreaks.familyId, familyId),
        eq(cookingStreaks.streakType, streakType)
      ));

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (existing) {
      const lastActivity = existing.lastActivity ? new Date(existing.lastActivity) : null;
      let newStreak = existing.currentStreak;

      if (lastActivity) {
        const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysDiff === 1) {
          // Continue streak
          newStreak = existing.currentStreak + 1;
        } else if (daysDiff > 1) {
          // Reset streak
          newStreak = 1;
        }
        // If daysDiff === 0, don't change streak (same day)
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(existing.longestStreak, newStreak);

      const [updated] = await db
        .update(cookingStreaks)
        .set({
          currentStreak: newStreak,
          longestStreak,
          lastActivity: today,
          updatedAt: new Date()
        })
        .where(eq(cookingStreaks.id, existing.id))
        .returning();
      
      return updated;
    } else {
      const [created] = await db
        .insert(cookingStreaks)
        .values({
          userId,
          familyId,
          streakType,
          currentStreak: 1,
          longestStreak: 1,
          lastActivity: today
        })
        .returning();
      
      return created;
    }
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    console.log('Debug - Storage getActiveChallenges called');
    
    // First get all challenges to debug
    const allChallenges = await db.select().from(challenges);
    console.log('Debug - Storage all challenges:', allChallenges.length, allChallenges.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));
    
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.isActive, true));
    
    console.log('Debug - Storage active challenges after filter:', activeChallenges.length, activeChallenges.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));
    
    return activeChallenges;
  }

  async getChallengeParticipants(challengeId: number): Promise<ChallengeParticipant[]> {
    return await db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId))
      .orderBy(asc(challengeParticipants.rank));
  }

  async joinChallenge(data: InsertChallengeParticipant): Promise<ChallengeParticipant> {
    const [participant] = await db
      .insert(challengeParticipants)
      .values(data)
      .returning();
    return participant;
  }

  async updateChallengeProgress(participantId: number, progress: any): Promise<ChallengeParticipant | undefined> {
    const [participant] = await db
      .update(challengeParticipants)
      .set({ progress })
      .where(eq(challengeParticipants.id, participantId))
      .returning();
    return participant;
  }

  async checkAndAwardAchievements(userId: string, familyId: number, action: string): Promise<UserAchievement[]> {
    const userStatsData = await this.getUserStats(userId, familyId);
    const userAchievements = await this.getUserAchievements(userId);
    const allAchievements = await this.getAllAchievements();
    
    const newAchievements: UserAchievement[] = [];
    
    for (const achievement of allAchievements) {
      // Skip if user already has this achievement
      const hasAchievement = userAchievements.some(ua => ua.achievementId === achievement.id);
      if (hasAchievement) continue;
      
      // Check achievement requirements
      const requirement = achievement.requirement as any;
      let earned = false;
      
      switch (achievement.category) {
        case 'cooking':
          if (requirement.recipesCooked && userStatsData?.recipesCooked >= requirement.recipesCooked) {
            earned = true;
          }
          break;
        case 'planning':
          if (requirement.mealsPlanned && userStatsData?.mealsPlanned >= requirement.mealsPlanned) {
            earned = true;
          }
          break;
        case 'streak':
          const streaks = await this.getCookingStreaks(userId, familyId);
          const relevantStreak = streaks.find(s => s.streakType === requirement.streakType);
          if (relevantStreak && relevantStreak.currentStreak >= requirement.streakLength) {
            earned = true;
          }
          break;
      }
      
      if (earned) {
        const newUserAchievement = await this.createUserAchievement({
          userId,
          achievementId: achievement.id,
          progress: requirement.target || 1,
          maxProgress: requirement.target || 1,
          isCompleted: true,
          completedAt: new Date()
        });
        
        // Award points
        await this.incrementUserStat(userId, familyId, 'totalPoints', achievement.points);
        await this.incrementUserStat(userId, familyId, 'achievementsUnlocked', 1);
        
        newAchievements.push(newUserAchievement);
      }
    }
    
    return newAchievements;
  }
}

export const storage = new DatabaseStorage();
