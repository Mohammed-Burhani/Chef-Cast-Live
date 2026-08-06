/**
 * Recipes API — admin-published, blog-style recipes.
 * Ingredients + steps are stored as JSONB so a recipe can also power the
 * cook-along experience later (see recipeRowToApp).
 */

import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';
import type { Recipe } from '@/types';

type RecipeRow = Database['public']['Tables']['recipes']['Row'];

export type RecipeIngredientInput = {
  name?: string;
  amount?: string;
  isOptional?: boolean;
};

export type RecipeStepInput = {
  stepNumber?: number;
  instruction?: string;
  durationSeconds?: number | null;
};

export type RecipeInput = {
  title: string;
  description?: string | null;
  image_url?: string | null;
  author_name?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  ingredients?: RecipeIngredientInput[];
  steps?: RecipeStepInput[];
  nutrition?: Json;
  is_published?: boolean;
};

// ============================================================================
// FETCHERS
// ============================================================================

/** Fetch recipes (newest first). Pass includeUnpublished for admin views. */
export async function fetchRecipes(includeUnpublished = false): Promise<RecipeRow[]> {
  let query = supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as RecipeRow[];
}

export async function fetchRecipeById(id: string): Promise<RecipeRow> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error) throw error;
  return data as RecipeRow;
}

// ============================================================================
// MUTATIONS (admin only — RLS enforces the admin check)
// ============================================================================

export async function createRecipe(input: RecipeInput): Promise<RecipeRow> {
  const { data, error } = await supabase.from('recipes').insert(input).select('*').single();
  if (error) throw error;
  return data as RecipeRow;
}

export async function updateRecipe(id: string, updates: Partial<RecipeInput>): Promise<RecipeRow> {
  const { data, error } = await supabase.from('recipes').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as RecipeRow;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// MAPPERS
// ============================================================================

/** Map a DB recipe row to the app Recipe type (used to seed a cook-along). */
export function recipeRowToApp(row: RecipeRow): Recipe {
  const ingredients = ((row.ingredients as any[]) ?? []).map((ing, i) => ({
    id: `ing-${i + 1}`,
    name: ing?.name ?? '',
    quantity: ing?.amount ?? '',
    unit: '',
    isOptional: !!ing?.isOptional,
  }));

  const steps = ((row.steps as any[]) ?? []).map((step, i) => ({
    id: `step-${i + 1}`,
    stepNumber: step?.stepNumber ?? i + 1,
    instruction: step?.instruction ?? '',
    durationSeconds: step?.durationSeconds,
  }));

  return {
    id: row.id,
    episodeId: '',
    title: row.title,
    description: row.description ?? '',
    difficulty: row.difficulty,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    servings: row.servings,
    steps,
    ingredients,
  };
}

/** Helper for rendering ingredient rows in the detail page. */
export type IngredientLine = { name: string; amount: string; isOptional: boolean };
export type StepLine = { stepNumber: number; instruction: string; durationSeconds?: number | null };

export function getIngredients(row: RecipeRow): IngredientLine[] {
  return ((row.ingredients as any[]) ?? []).map((ing, i) => ({
    name: ing?.name ?? `Ingredient ${i + 1}`,
    amount: ing?.amount ?? '',
    isOptional: !!ing?.isOptional,
  }));
}

export function getSteps(row: RecipeRow): StepLine[] {
  return ((row.steps as any[]) ?? []).map((step, i) => ({
    stepNumber: step?.stepNumber ?? i + 1,
    instruction: step?.instruction ?? '',
    durationSeconds: step?.durationSeconds ?? null,
  }));
}
