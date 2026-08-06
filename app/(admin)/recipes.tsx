/**
 * Admin Recipes Management — full recipe structure (blog-style CMS).
 * Admins create/edit recipes with ingredients + steps, published to the homepage.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useColors } from '@/hooks/useColors';
import { toast } from '@/utils/toast';
import {
  useAdminRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from '@/lib/api/hooks';
import type { RecipeInput } from '@/lib/api/recipes';
import { DataTable, Column } from '@/components/admin/DataTable';

type IngredientForm = { name: string; amount: string; isOptional: boolean };
type StepForm = { stepNumber: number; instruction: string; durationSeconds: string };

type RecipeForm = {
  title: string;
  description: string;
  image_url: string;
  author_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_minutes: string;
  cook_time_minutes: string;
  servings: string;
  is_published: boolean;
  ingredients: IngredientForm[];
  steps: StepForm[];
};

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const emptyIngredient = (): IngredientForm => ({ name: '', amount: '', isOptional: false });
const emptyStep = (stepNumber: number): StepForm => ({
  stepNumber,
  instruction: '',
  durationSeconds: '',
});

const emptyForm = (): RecipeForm => ({
  title: '',
  description: '',
  image_url: '',
  author_name: '',
  difficulty: 'medium',
  prep_time_minutes: '',
  cook_time_minutes: '',
  servings: '4',
  is_published: true,
  ingredients: [emptyIngredient()],
  steps: [emptyStep(1)],
});

export default function AdminRecipes() {
  const colors = useColors();
  const { data: recipes = [], isLoading } = useAdminRecipes();
  const createMutation = useCreateRecipe();
  const updateMutation = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RecipeForm>(emptyForm());

  const set = (patch: Partial<RecipeForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleCreate = () => {
    setEditingRecipe(null);
    setForm(emptyForm());
    setModalVisible(true);
  };

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe);

    const ings: IngredientForm[] = ((recipe.ingredients as any[]) ?? []).map((ing) => ({
      name: ing?.name ?? '',
      amount: ing?.amount ?? '',
      isOptional: !!ing?.isOptional,
    }));
    const steps: StepForm[] = ((recipe.steps as any[]) ?? []).map((step, i) => ({
      stepNumber: step?.stepNumber ?? i + 1,
      instruction: step?.instruction ?? '',
      durationSeconds: step?.durationSeconds ? String(step.durationSeconds) : '',
    }));

    setForm({
      title: recipe.title ?? '',
      description: recipe.description ?? '',
      image_url: recipe.image_url ?? '',
      author_name: recipe.author_name ?? '',
      difficulty: recipe.difficulty ?? 'medium',
      prep_time_minutes: recipe.prep_time_minutes ? String(recipe.prep_time_minutes) : '',
      cook_time_minutes: recipe.cook_time_minutes ? String(recipe.cook_time_minutes) : '',
      servings: recipe.servings ? String(recipe.servings) : '4',
      is_published: recipe.is_published !== false,
      ingredients: ings.length > 0 ? ings : [emptyIngredient()],
      steps: steps.length > 0 ? steps : [emptyStep(1)],
    });

    setModalVisible(true);
  };

  const buildPayload = (): RecipeInput => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    image_url: form.image_url.trim() || null,
    author_name: form.author_name.trim() || null,
    difficulty: form.difficulty,
    prep_time_minutes: parseInt(form.prep_time_minutes, 10) || 0,
    cook_time_minutes: parseInt(form.cook_time_minutes, 10) || 0,
    servings: parseInt(form.servings, 10) || 0,
    is_published: form.is_published,
    ingredients: form.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), isOptional: i.isOptional })),
    steps: form.steps
      .filter((s) => s.instruction.trim())
      .map((s, i) => ({
        stepNumber: i + 1,
        instruction: s.instruction.trim(),
        durationSeconds: s.durationSeconds && parseInt(s.durationSeconds, 10) > 0
          ? parseInt(s.durationSeconds, 10)
          : null,
      })),
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const payload = buildPayload();

    if (!payload.ingredients || payload.ingredients.length === 0) {
      Alert.alert('Error', 'Add at least one ingredient');
      return;
    }
    if (!payload.steps || payload.steps.length === 0) {
      Alert.alert('Error', 'Add at least one step');
      return;
    }

    setSaving(true);
    try {
      if (editingRecipe) {
        await updateMutation.mutateAsync({ id: editingRecipe.id, updates: payload });
        setModalVisible(false);
        toast.success('Recipe updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        setModalVisible(false);
        toast.success('Recipe created successfully');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (recipe: any) => {
    Alert.alert(
      'Delete Recipe',
      `Delete "${recipe.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(recipe.id);
              toast.success('Recipe deleted');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const updateIngredient = (index: number, patch: Partial<IngredientForm>) => {
    set({
      ingredients: form.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    });
  };

  const updateStep = (index: number, patch: Partial<StepForm>) => {
    set({ steps: form.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (recipe) => (
        <View style={styles.titleCell}>
          {recipe.image_url ? (
            <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
              <Image
                source={{ uri: recipe.image_url }}
                style={styles.thumbImg}
                contentFit="cover"
              />
            </View>
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="book-open" size={16} color={colors.mutedForeground} />
            </View>
          )}
          <Text style={[styles.recipeTitle, { color: colors.foreground }]}>{recipe.title}</Text>
        </View>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      width: 140,
      render: (recipe) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {recipe.author_name || '—'}
        </Text>
      ),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      width: 110,
      render: (recipe) => {
        const difficulty = recipe.difficulty || 'medium';
        const diffColors: Record<string, string> = {
          easy: colors.success,
          medium: colors.warning,
          hard: colors.danger,
        };
        return (
          <View style={[styles.diffBadge, { backgroundColor: `${diffColors[difficulty]}22` }]}>
            <Text style={[styles.diffText, { color: diffColors[difficulty] }]}>
              {DIFFICULTY_LABEL[difficulty] || difficulty}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'published',
      label: 'Published',
      width: 100,
      render: (recipe) => (
        <Text
          style={[
            styles.publishedText,
            { color: recipe.is_published ? colors.success : colors.mutedForeground },
          ]}
        >
          {recipe.is_published ? 'Yes' : 'Draft'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 160,
      render: (recipe) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {new Date(recipe.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 90,
      render: (recipe) => (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => handleEdit(recipe)}
          >
            <Feather name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(recipe)}
          >
            <Feather name="trash-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Recipes</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Blog-style recipes shown on the homepage — ingredients + steps included
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createBtnText}>New Recipe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <DataTable
          columns={columns}
          data={recipes}
          keyExtractor={(recipe) => recipe.id}
          emptyMessage="No recipes yet. Create your first one!"
        />
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Details */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>

                <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={form.title}
                  onChangeText={(text) => set({ title: text })}
                  placeholder="Saffron Risotto"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={form.description}
                  onChangeText={(text) => set({ description: text })}
                  placeholder="A creamy, golden one-pan risotto..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Image URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={form.image_url}
                  onChangeText={(text) => set({ image_url: text })}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Author Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={form.author_name}
                  onChangeText={(text) => set({ author_name: text })}
                  placeholder="Chef Maria"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Difficulty</Text>
                <View style={styles.segmented}>
                  {DIFFICULTIES.map((diff) => {
                    const active = form.difficulty === diff;
                    const diffColor =
                      diff === 'easy' ? colors.success : diff === 'hard' ? colors.danger : colors.warning;
                    return (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.segment,
                          { borderColor: colors.border },
                          active && { backgroundColor: `${diffColor}22`, borderColor: diffColor },
                        ]}
                        onPress={() => set({ difficulty: diff })}
                      >
                        <Text style={[styles.segmentText, { color: active ? diffColor : colors.mutedForeground }]}>
                          {DIFFICULTY_LABEL[diff]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.row3}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Prep (min)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={form.prep_time_minutes}
                      onChangeText={(text) => set({ prep_time_minutes: text.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      placeholder="10"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Cook (min)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={form.cook_time_minutes}
                      onChangeText={(text) => set({ cook_time_minutes: text.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      placeholder="25"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Servings</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={form.servings}
                      onChangeText={(text) => set({ servings: text.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      placeholder="4"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                <View style={styles.publishRow}>
                  <View style={styles.publishInfo}>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Published</Text>
                    <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                      {form.is_published
                        ? 'Visible on the homepage'
                        : 'Saved as a draft — hidden from homepage'}
                    </Text>
                  </View>
                  <Switch
                    value={form.is_published}
                    onValueChange={(v) => set({ is_published: v })}
                    trackColor={{ true: colors.success, false: colors.muted }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Ingredients */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ingredients</Text>
                    <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
                      Name, amount and optional flag
                    </Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.countBadgeText}>{form.ingredients.filter((i) => i.name.trim()).length}</Text>
                  </View>
                </View>

                {form.ingredients.map((ing, index) => (
                  <View key={index} style={[styles.listRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.listInput, styles.listInputName, { color: colors.foreground }]}
                      value={ing.name}
                      onChangeText={(text) => updateIngredient(index, { name: text })}
                      placeholder="Ingredient"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <TextInput
                      style={[styles.listInput, styles.listInputAmount, { color: colors.foreground }]}
                      value={ing.amount}
                      onChangeText={(text) => updateIngredient(index, { amount: text })}
                      placeholder="1 cup"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <TouchableOpacity
                      onPress={() => updateIngredient(index, { isOptional: !ing.isOptional })}
                      style={[
                        styles.optionalChip,
                        { borderColor: ing.isOptional ? colors.primary : colors.border },
                      ]}
                    >
                      <Text style={[styles.optionalText, { color: ing.isOptional ? colors.primary : colors.mutedForeground }]}>
                        Opt.
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        set({
                          ingredients:
                            form.ingredients.length > 1
                              ? form.ingredients.filter((_, i) => i !== index)
                              : [emptyIngredient()],
                        })
                      }
                      style={styles.removeBtn}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.addRowBtn, { borderColor: colors.border }]}
                  onPress={() => set({ ingredients: [...form.ingredients, emptyIngredient()] })}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                  <Text style={[styles.addRowText, { color: colors.primary }]}>Add Ingredient</Text>
                </TouchableOpacity>
              </View>

              {/* Steps */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Steps</Text>
                    <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
                      Instructions with optional duration
                    </Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.countBadgeText}>{form.steps.filter((s) => s.instruction.trim()).length}</Text>
                  </View>
                </View>

                {form.steps.map((step, index) => (
                  <View key={index} style={[styles.stepRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                    </View>
                    <TextInput
                      style={[styles.listInput, styles.stepInput, { color: colors.foreground }]}
                      value={step.instruction}
                      onChangeText={(text) => updateStep(index, { instruction: text })}
                      placeholder="Step instruction"
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                    />
                    <TextInput
                      style={[styles.listInput, styles.stepDuration, { color: colors.foreground }]}
                      value={step.durationSeconds}
                      onChangeText={(text) => updateStep(index, { durationSeconds: text.replace(/[^0-9]/g, '') })}
                      placeholder="secs"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        set({
                          steps:
                            form.steps.length > 1
                              ? form.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }))
                              : [emptyStep(1)],
                        })
                      }
                      style={styles.removeBtn}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.addRowBtn, { borderColor: colors.border }]}
                  onPress={() =>
                    set({ steps: [...form.steps, emptyStep(form.steps.length + 1)] })
                  }
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                  <Text style={[styles.addRowText, { color: colors.primary }]}>Add Step</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {saving ? 'Saving...' : editingRecipe ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 24 },
  titleCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  recipeTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  metaText: { fontSize: 13 },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  diffText: { fontSize: 11, fontWeight: '700' },
  publishedText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalScroll: { paddingHorizontal: 24 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 13 },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '700' },
  row3: {
    flexDirection: 'row',
    gap: 12,
  },
  field: { flex: 1 },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginTop: 16,
  },
  publishInfo: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  toggleDesc: { fontSize: 13 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  listInput: {
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  listInputName: { flex: 1.4 },
  listInputAmount: { flex: 1 },
  optionalChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionalText: { fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 6 },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addRowText: { fontSize: 14, fontWeight: '600' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepInput: { flex: 1 },
  stepDuration: { width: 64, textAlign: 'center' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
});
