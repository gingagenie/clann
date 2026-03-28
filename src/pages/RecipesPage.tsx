import { useState } from 'react'
import { useRecipes, type Recipe, type RecipeInput } from '@/hooks/useRecipes'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Pencil, ChefHat, X, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ── Ingredient editor ──────────────────────────────────────────

interface IngredientField {
  name: string
  quantity: string
}

function IngredientEditor({
  ingredients,
  onChange,
}: {
  ingredients: IngredientField[]
  onChange: (v: IngredientField[]) => void
}) {
  function update(idx: number, field: keyof IngredientField, value: string) {
    onChange(ingredients.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function remove(idx: number) {
    onChange(ingredients.filter((_, i) => i !== idx))
  }

  function addRow() {
    onChange([...ingredients, { name: '', quantity: '' }])
  }

  return (
    <div className="space-y-2">
      {ingredients.map((ing, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Input
            placeholder="Ingredient"
            value={ing.name}
            onChange={e => update(idx, 'name', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRow() } }}
            className="flex-1"
          />
          <Input
            placeholder="Qty"
            value={ing.quantity}
            onChange={e => update(idx, 'quantity', e.target.value)}
            className="w-20"
          />
          <button
            onClick={() => remove(idx)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium pt-0.5"
      >
        <Plus size={14} /> Add ingredient
      </button>
    </div>
  )
}

// ── AI search bar ──────────────────────────────────────────────

function AISearchBar({
  onResult,
}: {
  onResult: (title: string, ingredients: IngredientField[]) => void
}) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('recipe-search', {
      body: { meal: q },
    })

    setSearching(false)

    if (fnError) {
      console.error('[recipe-search] fn error:', fnError)
      setError(`Error: ${fnError.message}`)
      return
    }

    if (!data?.ingredients) {
      console.error('[recipe-search] unexpected response:', data)
      setError(data?.error ?? 'No ingredients returned. Try again.')
      return
    }

    const ingredients: IngredientField[] = (data.ingredients as { name: string; quantity: string }[])
      .map(i => ({ name: i.name, quantity: i.quantity ?? '' }))

    onResult(q, ingredients)
    setQuery('')
  }

  return (
    <div className="space-y-2 pb-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Sparkles size={12} />
        AI ingredient lookup
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="e.g. Chicken Tikka Masala"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
          className="flex-1"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
        >
          {searching
            ? <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            : <Search size={16} />
          }
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="border-t border-border pt-2" />
    </div>
  )
}

// ── Recipe card ────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onTap,
}: {
  recipe: Recipe
  onTap: () => void
}) {
  const count = recipe.ingredients.length
  return (
    <button
      onClick={onTap}
      className="flex w-full rounded-2xl border border-border bg-card text-left shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:shadow-md overflow-hidden"
    >
      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">{recipe.title}</p>
          {recipe.is_starter && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Starter
            </span>
          )}
        </div>
        {count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} ingredient{count !== 1 ? 's' : ''}
            {recipe.notes ? ' · ' + recipe.notes : ''}
          </p>
        )}
      </div>
      <div className="flex items-center pr-4 text-muted-foreground/50 shrink-0">
        {recipe.is_starter ? <Plus size={14} /> : <Pencil size={14} />}
      </div>
    </button>
  )
}

// ── Recipes page ───────────────────────────────────────────────

type SheetMode = { type: 'new' } | { type: 'edit'; recipe: Recipe } | { type: 'use'; recipe: Recipe } | null

export default function RecipesPage() {
  const { recipes, loading, saveRecipe, deleteRecipe } = useRecipes()
  const [sheet, setSheet] = useState<SheetMode>(null)

  const myRecipes      = recipes.filter(r => !r.is_starter)
  const starterRecipes = recipes.filter(r => r.is_starter)

  // For edit/use sheets, the recipe shown in the form
  const activeRecipe: Recipe | null =
    sheet?.type === 'edit' ? sheet.recipe :
    sheet?.type === 'use'  ? sheet.recipe :
    null

  // When "using" a starter, save as a new household recipe (no existingId)
  async function handleSave(input: RecipeInput) {
    const existingId = sheet?.type === 'edit' ? activeRecipe?.id : undefined
    await saveRecipe(input, existingId)
  }

  async function handleDelete() {
    if (activeRecipe && sheet?.type === 'edit') await deleteRecipe(activeRecipe.id)
  }

  // Whether the sheet is editing an existing *household* recipe
  const isEditing = sheet?.type === 'edit'

  // Recipe passed to the sheet form — starters pre-fill but save as new
  const sheetRecipe: Recipe | null = sheet?.type === 'edit' ? activeRecipe : null
  const prefillRecipe: Recipe | null = sheet?.type === 'use' ? activeRecipe : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <p className="text-sm font-bold text-foreground">Recipes</p>
          <Button size="sm" onClick={() => setSheet({ type: 'new' })}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {loading ? null : (
          <div className="px-3 pt-3 space-y-2">
            {/* My recipes */}
            {myRecipes.length > 0 && (
              <>
                {myRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onTap={() => setSheet({ type: 'edit', recipe })}
                  />
                ))}
              </>
            )}

            {/* Starter recipes */}
            {starterRecipes.length > 0 && (
              <>
                <p className={cn(
                  'text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1',
                  myRecipes.length > 0 ? 'pt-4' : 'pt-1',
                )}>
                  {myRecipes.length === 0 ? 'Get started' : 'More ideas'}
                </p>
                {starterRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onTap={() => setSheet({ type: 'use', recipe })}
                  />
                ))}
              </>
            )}

            {myRecipes.length === 0 && starterRecipes.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <ChefHat size={40} strokeWidth={1.25} />
                <p className="text-sm">No recipes yet</p>
              </div>
            )}

            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Sheet */}
      <Sheet open={!!sheet} onOpenChange={open => { if (!open) setSheet(null) }}>
        {sheet && (
          <RecipeSheetWithPrefill
            recipe={sheetRecipe}
            prefill={prefillRecipe}
            isEditing={isEditing}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSheet(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

// Thin wrapper that handles prefill from starter recipes
function RecipeSheetWithPrefill({
  recipe,
  prefill,
  isEditing,
  onSave,
  onDelete,
  onClose,
}: {
  recipe: Recipe | null
  prefill: Recipe | null
  isEditing: boolean
  onSave: (input: RecipeInput) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  // Build a fake "new recipe" seeded with starter data for the form
  const formRecipe: Recipe | null = prefill
    ? { ...prefill, id: '', household_id: null, is_starter: false }
    : recipe

  return (
    <RecipeSheet
      recipe={isEditing ? formRecipe : null}
      prefillData={prefill ? {
        title: prefill.title,
        ingredients: prefill.ingredients.map(i => ({ name: i.name, quantity: i.quantity ?? '' })),
      } : undefined}
      onSave={onSave}
      onDelete={onDelete}
      onClose={onClose}
    />
  )
}

// Updated RecipeSheet that accepts optional prefillData for starters
function RecipeSheet({
  recipe,
  prefillData,
  onSave,
  onDelete,
  onClose,
}: {
  recipe: Recipe | null
  prefillData?: { title: string; ingredients: { name: string; quantity: string }[] }
  onSave: (input: RecipeInput) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const isNew = !recipe

  const [title, setTitle] = useState(prefillData?.title ?? recipe?.title ?? '')
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientField[]>(
    prefillData?.ingredients.length
      ? prefillData.ingredients
      : recipe?.ingredients.length
        ? recipe.ingredients.map(i => ({ name: i.name, quantity: i.quantity ?? '' }))
        : [{ name: '', quantity: '' }]
  )
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function handleAIResult(mealTitle: string, aiIngredients: IngredientField[]) {
    if (!title.trim()) setTitle(mealTitle)
    setIngredients(aiIngredients)
    setError(null)
  }

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a recipe name.'); return }
    setSaving(true)
    setError(null)
    await onSave({ title, notes, ingredients })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    onClose()
  }

  const sheetTitle = prefillData
    ? 'Save to my recipes'
    : isNew ? 'New recipe' : 'Edit recipe'

  return (
    <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-5 max-w-lg mx-auto max-h-[92dvh] overflow-y-auto">
      <SheetHeader className="mb-4 text-left">
        <SheetTitle>{sheetTitle}</SheetTitle>
        {prefillData && (
          <p className="text-sm text-muted-foreground">Customise then save to your recipes</p>
        )}
      </SheetHeader>

      <div className="space-y-4">
        {/* AI search — only on blank new recipes */}
        {isNew && !prefillData && <AISearchBar onResult={handleAIResult} />}

        <div className="space-y-1.5">
          <Label htmlFor="recipeTitle">Recipe name</Label>
          <Input
            id="recipeTitle"
            placeholder="e.g. Spaghetti bolognese"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Ingredients</Label>
          <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recipeNotes">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="recipeNotes"
            placeholder="e.g. Double sauce, use wholemeal pasta"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          {!isNew && !prefillData && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 size={16} />
            </Button>
          )}
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            ) : prefillData ? 'Save to my recipes' : isNew ? 'Save recipe' : 'Update'}
          </Button>
        </div>
      </div>
    </SheetContent>
  )
}
