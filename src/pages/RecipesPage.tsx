import { useState } from 'react'
import { useRecipes, type Recipe, type RecipeInput } from '@/hooks/useRecipes'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Pencil, ChefHat, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ── Ingredient row in the editor ───────────────────────────────

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
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addRow() }
            }}
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

// ── Recipe edit sheet ──────────────────────────────────────────

interface RecipeSheetProps {
  recipe: Recipe | null       // null = new
  onSave: (input: RecipeInput) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

function RecipeSheet({ recipe, onSave, onDelete, onClose }: RecipeSheetProps) {
  const [title, setTitle] = useState(recipe?.title ?? '')
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientField[]>(
    recipe?.ingredients.length
      ? recipe.ingredients.map(i => ({ name: i.name, quantity: i.quantity ?? '' }))
      : [{ name: '', quantity: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-5 max-w-lg mx-auto max-h-[92dvh] overflow-y-auto">
      <SheetHeader className="mb-4 text-left">
        <SheetTitle>{recipe ? 'Edit recipe' : 'New recipe'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="recipeTitle">Recipe name</Label>
          <Input
            id="recipeTitle"
            placeholder="e.g. Spaghetti bolognese"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
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
          {recipe && (
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
            ) : recipe ? 'Update' : 'Save recipe'}
          </Button>
        </div>
      </div>
    </SheetContent>
  )
}

// ── Recipe card ────────────────────────────────────────────────

function RecipeCard({ recipe, onTap }: { recipe: Recipe; onTap: () => void }) {
  const count = recipe.ingredients.length
  return (
    <button
      onClick={onTap}
      className="flex w-full rounded-xl border border-border bg-card text-left transition-all active:scale-[0.99] hover:border-primary/40 overflow-hidden"
    >
      <div className="flex-1 px-4 py-3.5">
        <p className="font-semibold text-foreground">{recipe.title}</p>
        {count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} ingredient{count !== 1 ? 's' : ''}
            {recipe.notes ? ' · ' + recipe.notes : ''}
          </p>
        )}
      </div>
      <div className="flex items-center pr-4 text-muted-foreground/50">
        <Pencil size={14} />
      </div>
    </button>
  )
}

// ── Recipes page ───────────────────────────────────────────────

type SheetMode = { type: 'new' } | { type: 'edit'; recipe: Recipe } | null

export default function RecipesPage() {
  const { recipes, loading, saveRecipe, deleteRecipe } = useRecipes()
  const [sheet, setSheet] = useState<SheetMode>(null)

  const activeRecipe = sheet?.type === 'edit' ? sheet.recipe : null

  async function handleSave(input: RecipeInput) {
    await saveRecipe(input, activeRecipe?.id)
  }

  async function handleDelete() {
    if (activeRecipe) await deleteRecipe(activeRecipe.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <p className="text-sm font-bold text-foreground">Recipes</p>
          <Button size="sm" onClick={() => setSheet({ type: 'new' })}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {loading ? null : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <ChefHat size={40} strokeWidth={1.25} />
            <p className="text-sm">No recipes yet</p>
            <button
              onClick={() => setSheet({ type: 'new' })}
              className="text-sm text-primary hover:underline font-medium"
            >
              Add your first recipe
            </button>
          </div>
        ) : (
          <div className={cn('px-3 pt-3 space-y-2')}>
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onTap={() => setSheet({ type: 'edit', recipe })}
              />
            ))}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Edit / new sheet */}
      <Sheet open={!!sheet} onOpenChange={open => { if (!open) setSheet(null) }}>
        {sheet && (
          <RecipeSheet
            recipe={activeRecipe}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSheet(null)}
          />
        )}
      </Sheet>
    </div>
  )
}
