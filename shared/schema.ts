import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  cookingSkillLevel: varchar("cooking_skill_level", { enum: ["beginner", "intermediate", "advanced", "expert"] }),
  preferredDifficulty: varchar("preferred_difficulty", { enum: ["easy", "medium", "hard", "any"] }),
  favoriteCuisine: varchar("favorite_cuisine"),
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergies: text("allergies").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Families table
export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  familyImageUrl: varchar("family_image_url"),
  timezone: varchar("timezone").default("America/New_York"),
  currency: varchar("currency").default("USD"),
  weekStartsOn: varchar("week_starts_on", { enum: ["sunday", "monday"] }).default("sunday"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family membership table
export const familyMemberships = pgTable("family_memberships", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).notNull().default("member"), // admin, member
  displayName: varchar("display_name", { length: 255 }),
  memberImageUrl: varchar("member_image_url"),
  foodPreferences: text("food_preferences").array(),
  allergies: text("allergies").array(),
  dietType: varchar("diet_type"),
  favoriteFoods: text("favorite_foods").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipes table
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  prepTime: integer("prep_time"), // in minutes
  cookTime: integer("cook_time"), // in minutes
  servings: integer("servings"),
  imageUrl: varchar("image_url"),
  tags: text("tags").array(),
  nutritionInfo: jsonb("nutrition_info"), // calories, protein, carbs, fat, etc.
  difficulty: varchar("difficulty", { length: 20 }), // easy, medium, hard
  rating: decimal("rating", { precision: 3, scale: 2 }),
  ratingCount: integer("rating_count").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meal types table
export const mealTypes = pgTable("meal_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // breakfast, lunch, dinner, snack
  displayOrder: integer("display_order").default(0),
});

// Meals table (scheduled meals)
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  recipeId: integer("recipe_id").references(() => recipes.id),
  mealTypeId: integer("meal_type_id").notNull().references(() => mealTypes.id),
  scheduledDate: date("scheduled_date").notNull(),
  servings: integer("servings"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("planned"), // planned, prepared, completed
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nutrition logs table
export const nutritionLogs = pgTable("nutrition_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  familyId: integer("family_id").notNull().references(() => families.id),
  mealTypeId: integer("meal_type_id").references(() => mealTypes.id),
  foodName: varchar("food_name", { length: 255 }).notNull(),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 5, scale: 2 }),
  carbs: decimal("carbs", { precision: 5, scale: 2 }),
  fat: decimal("fat", { precision: 5, scale: 2 }),
  fiber: decimal("fiber", { precision: 5, scale: 2 }),
  sugar: decimal("sugar", { precision: 5, scale: 2 }),
  sodium: decimal("sodium", { precision: 7, scale: 2 }),
  loggedDate: date("logged_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping lists table
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopping list items table
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shopping_list_id").notNull().references(() => shoppingLists.id),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  unit: varchar("unit", { length: 50 }), // cups, lbs, oz, etc.
  category: varchar("category", { length: 100 }), // produce, dairy, meat, pantry, etc.
  aisle: varchar("aisle", { length: 50 }), // grocery store aisle location
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
  estimatedPrice: decimal("estimated_price", { precision: 6, scale: 2 }),
  sourceType: varchar("source_type", { length: 50 }).default("manual"), // manual, recipe, recurring
  sourceId: integer("source_id"), // recipe_id if from recipe, meal_id if from meal
  priority: integer("priority").default(3), // 1=high, 2=medium, 3=low
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pantry inventory table for tracking what families already have
export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  category: varchar("category", { length: 100 }),
  expirationDate: timestamp("expiration_date"),
  location: varchar("location", { length: 100 }), // pantry, fridge, freezer
  isLow: boolean("is_low").default(false), // flag for low stock
  reorderThreshold: varchar("reorder_threshold", { length: 100 }),
  notes: text("notes"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant orders table
export const restaurantOrders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  restaurantName: varchar("restaurant_name", { length: 255 }).notNull(),
  orderNumber: varchar("order_number", { length: 100 }),
  totalAmount: decimal("total_amount", { precision: 8, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  orderDate: timestamp("order_date").notNull(),
  deliveryAddress: text("delivery_address"),
  status: varchar("status", { length: 50 }).default("completed"), // pending, confirmed, preparing, delivered, completed
  cuisine: varchar("cuisine", { length: 100 }),
  items: jsonb("items"), // array of order items
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gamification tables
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // cooking, nutrition, planning, social
  badgeIcon: varchar("badge_icon"), // icon name or emoji
  badgeColor: varchar("badge_color"), // hex color code
  difficulty: varchar("difficulty").notNull(), // bronze, silver, gold, platinum
  points: integer("points").notNull(),
  requirement: jsonb("requirement").notNull(), // conditions to unlock
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  achievementId: integer("achievement_id").notNull(),
  progress: integer("progress").default(0),
  maxProgress: integer("max_progress").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cookingStreaks = pgTable("cooking_streaks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  familyId: integer("family_id").notNull(),
  streakType: varchar("streak_type").notNull(), // daily_cooking, recipe_trying, meal_planning
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // weekly, monthly, seasonal, special
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  requirements: jsonb("requirements").notNull(),
  rewards: jsonb("rewards").notNull(), // points, badges, special unlocks
  difficulty: varchar("difficulty").notNull(),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengeParticipants = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(),
  userId: varchar("user_id").notNull(),
  familyId: integer("family_id").notNull(),
  progress: jsonb("progress").default({}),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  familyId: integer("family_id").notNull(),
  totalPoints: integer("total_points").default(0),
  level: integer("level").default(1),
  recipesCooked: integer("recipes_cooked").default(0),
  mealsPlanned: integer("meals_planned").default(0),
  favoriteCuisine: varchar("favorite_cuisine"),
  cookingSkillLevel: varchar("cooking_skill_level").default("beginner"), // beginner, intermediate, advanced, expert
  preferredDifficulty: varchar("preferred_difficulty").default("easy"),
  achievementsUnlocked: integer("achievements_unlocked").default(0),
  challengesCompleted: integer("challenges_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  familyMemberships: many(familyMemberships),
  createdFamilies: many(families),
  createdRecipes: many(recipes),
  nutritionLogs: many(nutritionLogs),
  createdShoppingLists: many(shoppingLists),
  createdOrders: many(restaurantOrders),
  userAchievements: many(userAchievements),
  cookingStreaks: many(cookingStreaks),
  challengeParticipations: many(challengeParticipants),
  stats: many(userStats),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  creator: one(users, {
    fields: [families.createdBy],
    references: [users.id],
  }),
  memberships: many(familyMemberships),
  recipes: many(recipes),
  meals: many(meals),
  nutritionLogs: many(nutritionLogs),
  shoppingLists: many(shoppingLists),
  pantryItems: many(pantryItems),
  restaurantOrders: many(restaurantOrders),
}));

export const familyMembershipsRelations = relations(familyMemberships, ({ one }) => ({
  family: one(families, {
    fields: [familyMemberships.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMemberships.userId],
    references: [users.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  family: one(families, {
    fields: [recipes.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [recipes.createdBy],
    references: [users.id],
  }),
  meals: many(meals),
}));

export const mealTypesRelations = relations(mealTypes, ({ many }) => ({
  meals: many(meals),
  nutritionLogs: many(nutritionLogs),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  family: one(families, {
    fields: [meals.familyId],
    references: [families.id],
  }),
  recipe: one(recipes, {
    fields: [meals.recipeId],
    references: [recipes.id],
  }),
  mealType: one(mealTypes, {
    fields: [meals.mealTypeId],
    references: [mealTypes.id],
  }),
  creator: one(users, {
    fields: [meals.createdBy],
    references: [users.id],
  }),
}));

export const nutritionLogsRelations = relations(nutritionLogs, ({ one }) => ({
  user: one(users, {
    fields: [nutritionLogs.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [nutritionLogs.familyId],
    references: [families.id],
  }),
  mealType: one(mealTypes, {
    fields: [nutritionLogs.mealTypeId],
    references: [mealTypes.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  family: one(families, {
    fields: [shoppingLists.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [shoppingLists.createdBy],
    references: [users.id],
  }),
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
}));

export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
  family: one(families, {
    fields: [pantryItems.familyId],
    references: [families.id],
  }),
}));

export const restaurantOrdersRelations = relations(restaurantOrders, ({ one }) => ({
  family: one(families, {
    fields: [restaurantOrders.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [restaurantOrders.createdBy],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const cookingStreaksRelations = relations(cookingStreaks, ({ one }) => ({
  user: one(users, {
    fields: [cookingStreaks.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [cookingStreaks.familyId],
    references: [families.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [challengeParticipants.familyId],
    references: [families.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [userStats.familyId],
    references: [families.id],
  }),
}));

// Insert schemas
export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilyMembershipSchema = createInsertSchema(familyMemberships).omit({
  id: true,
  createdAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  ratingCount: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  createdAt: true,
});

export const insertNutritionLogSchema = createInsertSchema(nutritionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrders).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;
export type InsertFamilyMembership = z.infer<typeof insertFamilyMembershipSchema>;
export type FamilyMembership = typeof familyMemberships.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type MealType = typeof mealTypes.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertNutritionLog = z.infer<typeof insertNutritionLogSchema>;
export type NutritionLog = typeof nutritionLogs.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertRestaurantOrder = z.infer<typeof insertRestaurantOrderSchema>;
export type RestaurantOrder = typeof restaurantOrders.$inferSelect;

export type PantryItem = typeof pantryItems.$inferSelect;
export type InsertPantryItem = typeof pantryItems.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type CookingStreak = typeof cookingStreaks.$inferSelect;
export type InsertCookingStreak = typeof cookingStreaks.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type InsertChallengeParticipant = typeof challengeParticipants.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = typeof userStats.$inferInsert;

// Family addresses table
export const familyAddresses = pgTable("family_addresses", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  addressType: varchar("address_type", { enum: ["home", "work", "other"] }).default("home"),
  label: varchar("label"),
  street: varchar("street").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  country: varchar("country").default("US"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Family meal times table
export const familyMealTimes = pgTable("family_meal_times", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  mealName: varchar("meal_name").notNull(),
  defaultTime: varchar("default_time"),
  daysOfWeek: text("days_of_week").array(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shopping site preferences table
export const shoppingSitePreferences = pgTable("shopping_site_preferences", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  siteName: varchar("site_name").notNull(),
  siteUrl: varchar("site_url"),
  accountEmail: varchar("account_email"),
  deliveryPreferences: jsonb("delivery_preferences"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  mealReminders: boolean("meal_reminders").default(true),
  shoppingListUpdates: boolean("shopping_list_updates").default(true),
  achievementAlerts: boolean("achievement_alerts").default(true),
  familyInvitations: boolean("family_invitations").default(true),
  profileVisibility: varchar("profile_visibility", { enum: ["public", "family", "private"] }).default("family"),
  shareRecipes: boolean("share_recipes").default(true),
  shareMealPlans: boolean("share_meal_plans").default(true),
  shareAchievements: boolean("share_achievements").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family preferences table
export const familyPreferences = pgTable("family_preferences", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id),
  allowGuestAccess: boolean("allow_guest_access").default(false),
  requireApprovalForNewRecipes: boolean("require_approval_for_new_recipes").default(false),
  sharedShoppingLists: boolean("shared_shopping_lists").default(true),
  sharedMealPlanning: boolean("shared_meal_planning").default(true),
  automaticNutritionTracking: boolean("automatic_nutrition_tracking").default(false),
  enableAchievements: boolean("enable_achievements").default(true),
  defaultMealPlanVisibility: varchar("default_meal_plan_visibility", { enum: ["private", "family", "public"] }).default("family"),
  budgetTracking: boolean("budget_tracking").default(false),
  monthlyBudget: decimal("monthly_budget", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertFamilyAddressSchema = createInsertSchema(familyAddresses).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyMealTimeSchema = createInsertSchema(familyMealTimes).omit({
  id: true,
  createdAt: true,
});

export const insertShoppingSitePreferenceSchema = createInsertSchema(shoppingSitePreferences).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilyPreferencesSchema = createInsertSchema(familyPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type FamilyAddress = typeof familyAddresses.$inferSelect;
export type InsertFamilyAddress = z.infer<typeof insertFamilyAddressSchema>;
export type FamilyMealTime = typeof familyMealTimes.$inferSelect;
export type InsertFamilyMealTime = z.infer<typeof insertFamilyMealTimeSchema>;
export type ShoppingSitePreference = typeof shoppingSitePreferences.$inferSelect;
export type InsertShoppingSitePreference = z.infer<typeof insertShoppingSitePreferenceSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type FamilyPreferences = typeof familyPreferences.$inferSelect;
export type InsertFamilyPreferences = z.infer<typeof insertFamilyPreferencesSchema>;
