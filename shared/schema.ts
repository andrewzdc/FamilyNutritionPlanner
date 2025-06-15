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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Families table
export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
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
  foodPreferences: text("food_preferences").array(),
  allergies: text("allergies").array(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  familyMemberships: many(familyMemberships),
  createdFamilies: many(families),
  createdRecipes: many(recipes),
  nutritionLogs: many(nutritionLogs),
  createdShoppingLists: many(shoppingLists),
  createdOrders: many(restaurantOrders),
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
