import { z } from 'zod';

export const quantitySchema = z.string().regex(/^\d+(\.\d{1,4})?$/);
export const unitSchema = z.enum(['count', 'serving', 'tsp', 'tbsp', 'fl_oz', 'cup', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'package', 'bag', 'can', 'bottle', 'bunch']);
export const ingredientAmountSchema = z.object({ ingredientId: z.string().min(1), name: z.string().min(1), quantity: quantitySchema, unit: unitSchema, optional: z.boolean().optional() });
export const inventoryAdjustmentSchema = z.object({ inventoryItemId: z.string().uuid(), quantityDelta: z.string().regex(/^-?\d+(\.\d{1,4})?$/), unit: unitSchema, reason: z.enum(['manual', 'discarded', 'expired', 'cooking_difference']), confirmationToken: z.string().optional() });
export const reserveMealSchema = z.object({ planId: z.string().uuid(), recipeVersionId: z.string().uuid(), date: z.string().date(), slot: z.enum(['lunch', 'dinner']), servings: z.number().positive().max(24) });
export const feedbackSchema = z.object({ mealLogId: z.string().uuid(), overallRating: z.number().int().min(1).max(10), wouldMakeAgain: z.boolean(), portion: z.enum(['small', 'right', 'large']), leftoverRating: z.number().int().min(1).max(5).optional(), effort: z.number().int().min(1).max(5), cleanup: z.number().int().min(1).max(5), tags: z.array(z.string()).max(20), notes: z.string().max(4000).optional() });
export const generatedRecipeSchema = z.object({ title: z.string().min(3), description: z.string(), servings: z.number().int().positive().max(24), prepMinutes: z.number().int().nonnegative().max(480), cookMinutes: z.number().int().positive().max(720), difficulty: z.enum(['Easy', 'Medium', 'Ambitious']), estimatedCost: quantitySchema, caloriesPerServing:z.number().int().min(50).max(3000), proteinGramsPerServing:z.number().int().min(0).max(300), ingredients: z.array(ingredientAmountSchema).min(2).max(40), steps: z.array(z.string().min(3)).min(1).max(30), equipment: z.array(z.string()).max(20), safetyNotes: z.array(z.string()).max(20), substitutions: z.array(z.string()).max(20), tags: z.array(z.string()).max(20), cuisine: z.string().min(1), protein: z.string().min(1), cleanup: z.number().int().min(1).max(5), leftoverQuality: z.number().int().min(1).max(5), leftoverDays: z.number().int().min(0).max(7), reheating: z.string(), flavorProfile: z.array(z.string()), leftoverGuidance: z.string(), imageSearchQuery: z.string().min(3).max(160), confidence: z.number().min(0).max(1), unresolvedIngredientMappings: z.array(z.string()) });
export const prepAllocationSchema = z.object({ mealId:z.string().min(1).max(120),mealTitle:z.string().min(1).max(200),mealDate:z.string().date(),quantity:quantitySchema,unit:unitSchema });
export const prepIngredientSchema = z.object({ ingredientId:z.string().min(1).max(200),name:z.string().min(1).max(160),totalQuantity:quantitySchema,unit:unitSchema,allocations:z.array(prepAllocationSchema).min(1).max(20) });
export const weeklyPrepTaskSchema = z.object({ id:z.string().min(1).max(120),order:z.number().int().min(1).max(100),title:z.string().min(3).max(200),action:z.string().min(3).max(1000),estimatedMinutes:z.number().int().min(1).max(240),weekdayMinutesSaved:z.number().int().min(0).max(480),storage:z.string().min(3).max(1000),foodSafety:z.string().max(1000).optional(),ingredients:z.array(prepIngredientSchema).min(1).max(20) });
export const weeklyPrepPlanSchema = z.object({ weekStart:z.string().date(),summary:z.string().min(3).max(1000),totalMinutes:z.number().int().min(1).max(720),estimatedWeeknightMinutesSaved:z.number().int().min(0).max(2000),generatedAt:z.string().datetime(),tasks:z.array(weeklyPrepTaskSchema).min(1).max(100) });
export const confirmationRequiredSchema = z.object({ status: z.literal('confirmation_required'), confirmationToken: z.string(), summary: z.string(), expiresAt: z.string().datetime() });
export const apiErrorSchema = z.object({ requestId: z.string(), error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean(), fields: z.record(z.string()).optional() }) });
export const scopeSchema = z.enum(['inventory:read', 'inventory:write', 'plans:read', 'plans:write', 'recipes:read', 'recipes:write', 'cooking:write', 'feedback:write', 'groceries:read', 'groceries:write', 'budget:read']);

export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;
export type WeeklyPrepPlan = z.infer<typeof weeklyPrepPlanSchema>;
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type IntegrationScope = z.infer<typeof scopeSchema>;

export interface AIProvider {
  generateRecipe(input: Record<string, unknown>): Promise<GeneratedRecipe>;
  adaptRecipe(input: Record<string, unknown>): Promise<GeneratedRecipe>;
  interpretFeedback(input: { notes: string; tags: string[] }): Promise<Record<string, unknown>>;
  explainRecommendation(input: Record<string, unknown>): Promise<string>;
  parseReceipt?(input: { imageBase64: string }): Promise<Record<string, unknown>>;
}
