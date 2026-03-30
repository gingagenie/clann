import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useMealPlans, type MealPlan } from '@/hooks/useMealPlans'
import { useRecipes, type Recipe } from '@/hooks/useRecipes'
import { supabase } from '@/lib/supabase'
import {
  startOfDay, addDays, isSameDay, getWeekStart,
  toDateString, formatWeekRange, DAY_SHORT, MONTHS,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { mergeQuantity } from '@/lib/quantities'
import { categorise } from '@/lib/categorise'
import {
  ChevronLeft, ChevronRight, UtensilsCrossed, Pencil,
  Trash2, ShoppingCart, Check, ArrowLeft, Search, ChefHat, X, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// ── Food emoji helper ──────────────────────────────────────────

function mealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (/pasta|spaghetti|lasagne|penne|mac.*cheese|linguine|fettuccine/.test(t)) return '🍝'
  if (/pizza/.test(t))                                                          return '🍕'
  if (/burger/.test(t))                                                         return '🍔'
  if (/taco|fajita|nacho/.test(t))                                              return '🌮'
  if (/curry|tikka|masala|butter chicken/.test(t))                              return '🍛'
  if (/soup/.test(t))                                                           return '🍲'
  if (/salad/.test(t))                                                          return '🥗'
  if (/salmon|prawn|fish|seafood|teriyaki/.test(t))                             return '🐟'
  if (/stir.fry|fried rice|noodle/.test(t))                                     return '🍜'
  if (/roast|schnitzel|chop|lamb/.test(t))                                      return '🍖'
  if (/chicken/.test(t))                                                        return '🍗'
  if (/beef|steak|mince/.test(t))                                               return '🥩'
  if (/sausage|snag/.test(t))                                                   return '🌭'
  if (/egg|quiche/.test(t))                                                     return '🥚'
  if (/rice/.test(t))                                                           return '🍚'
  return '🍽️'
}

// ── Meal day card ──────────────────────────────────────────────

interface MealCardProps {
  date: Date
  isToday: boolean
  isPast: boolean
  meal: MealPlan | undefined
  onTap: () => void
}

function MealCard({ date, isToday, isPast, meal, onTap }: MealCardProps) {
  if (isToday) {
    return (
      <button
        onClick={onTap}
        className="w-full rounded-2xl overflow-hidden text-left shadow-md border border-primary/20 bg-card active:scale-[0.99] transition-transform"
      >
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary-foreground leading-none">{date.getDate()}</span>
            <span className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider">
              {DAY_SHORT[date.getDay()]}
            </span>
          </div>
          <span className="ml-auto text-xs font-black text-primary-foreground/70 uppercase tracking-widest">Tonight</span>
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3 min-h-[64px]">
          {meal ? (
            <>
              <span className="text-2xl shrink-0">{mealEmoji(meal.title)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground truncate">{meal.title}</p>
                {meal.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.notes}</p>}
              </div>
              <Pencil size={14} className="shrink-0 text-muted-foreground/40" />
            </>
          ) : (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <UtensilsCrossed size={18} className="shrink-0" />
              <span className="text-sm font-medium">What's for dinner tonight?</span>
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className={cn(
        'flex w-full rounded-2xl border border-border bg-card overflow-hidden text-left shadow-sm transition-all active:scale-[0.99] hover:border-primary/30 hover:shadow-md',
        isPast && 'opacity-50',
      )}
    >
      <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4 gap-0.5 bg-muted/40 border-r border-border">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {DAY_SHORT[date.getDay()]}
        </span>
        <span className="text-2xl font-black leading-none text-foreground">{date.getDate()}</span>
      </div>
      <div className="flex-1 px-4 py-3 flex items-center gap-3 min-h-[72px]">
        {meal ? (
          <>
            <span className="text-xl shrink-0">{mealEmoji(meal.title)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{meal.title}</p>
              {meal.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.notes}</p>}
            </div>
            <Pencil size={13} className="shrink-0 text-muted-foreground/40" />
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <UtensilsCrossed size={15} className="shrink-0" />
            <span className="text-sm">Plan a meal</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Full-screen meal picker ────────────────────────────────────

type PickerMode = 'choice' | 'recipe-list' | 'edit' | 'ai'

interface MealPickerProps {
  date: Date
  meal: MealPlan | undefined
  recipes: Recipe[]
  onSave: (title: string, notes: string, recipeId: string | null, addToShopping: boolean, recipe: Recipe | null) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

function MealPicker({ date, meal, recipes, onSave, onDelete, onClose }: MealPickerProps) {
  const isEditing = !!meal
  const { household } = useHousehold()

  const [mode,          setMode]          = useState<PickerMode>(isEditing ? 'edit' : 'choice')
  const [search,        setSearch]        = useState('')
  const [title,         setTitle]         = useState(meal?.title ?? '')
  const [notes,         setNotes]         = useState(meal?.notes ?? '')
  const [recipeId,      setRecipeId]      = useState<string | null>(meal?.recipe_id ?? null)
  const [addToShopping, setAddToShopping] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // AI mode
  const [aiQuery,       setAiQuery]       = useState('')
  const [aiSearching,   setAiSearching]   = useState(false)
  const [aiError,       setAiError]       = useState<string | null>(null)
  const [aiTitle,       setAiTitle]       = useState('')
  const [aiIngredients, setAiIngredients] = useState<{ name: string; quantity: string }[]>([])
  const [aiSaving,      setAiSaving]      = useState(false)

  async function handleAILookup() {
    const q = aiQuery.trim()
    if (!q) return
    setAiSearching(true)
    setAiError(null)
    setAiIngredients([])

    const { data, error: fnError } = await supabase.functions.invoke('recipe-search', { body: { meal: q } })
    setAiSearching(false)

    if (fnError || !data?.ingredients) {
      setAiError(fnError?.message ?? data?.error ?? 'No result. Try again.')
      return
    }

    setAiTitle(q)
    setAiIngredients((data.ingredients as { name: string; quantity: string }[]).filter(i => i.name.trim()))
  }

  async function handleAISave() {
    if (!aiTitle.trim() || !household) return
    setAiSaving(true)

    const { data: recipeData, error: recipeErr } = await supabase
      .from('recipes')
      .insert({ household_id: household.id, title: aiTitle.trim(), notes: null })
      .select()
      .single()

    if (recipeErr || !recipeData) {
      setAiError(recipeErr?.message ?? 'Failed to save.')
      setAiSaving(false)
      return
    }

    const newId = (recipeData as any).id as string
    const toInsert = aiIngredients
      .filter(i => i.name.trim())
      .map((i, idx) => ({ recipe_id: newId, name: i.name.trim(), quantity: i.quantity.trim() || null, sort_order: idx }))

    if (toInsert.length > 0) {
      await supabase.from('recipe_ingredients').insert(toInsert)
    }

    setAiSaving(false)

    const newRecipe: Recipe = {
      id: newId,
      household_id: household.id,
      title: aiTitle.trim(),
      notes: null,
      is_starter: false,
      created_at: new Date().toISOString(),
      ingredients: toInsert.map((i, idx) => ({ id: '', recipe_id: newId, name: i.name, quantity: i.quantity ?? null, sort_order: idx })),
    }
    handleSelectRecipe(newRecipe)
  }

  const yourRecipes    = recipes.filter(r => !r.is_starter)
  const starterRecipes = recipes.filter(r => r.is_starter)
  const selectedRecipe = recipeId ? recipes.find(r => r.id === recipeId) ?? null : null

  const dateLabel = `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`

  function filterRecipes(list: Recipe[]) {
    if (!search.trim()) return list
    return list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
  }

  function handleSelectRecipe(recipe: Recipe) {
    setRecipeId(recipe.id)
    setTitle(recipe.title)
    if (recipe.ingredients.length > 0) setAddToShopping(true)
    setMode('edit')
  }

  function handleBack() {
    if (mode === 'recipe-list') { setSearch(''); setMode('choice') }
    else if (mode === 'ai') { setAiQuery(''); setAiIngredients([]); setAiError(null); setMode('choice') }
    else onClose()
  }

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a meal name.'); return }
    setSaving(true)
    setError(null)
    await onSave(title, notes, recipeId, addToShopping, selectedRecipe)
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-2 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">
            {mode === 'recipe-list' ? 'Pick a recipe' : mode === 'ai' ? 'Create with AI' : isEditing ? 'Edit meal' : 'Plan a meal'}
          </p>
          {mode !== 'recipe-list' && (
            <p className="text-xs text-muted-foreground leading-tight">{dateLabel}</p>
          )}
        </div>
      </div>

      {/* ── Choice ── */}
      {mode === 'choice' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-lg mx-auto w-full">
          <button
            onClick={() => setMode('recipe-list')}
            className="w-full rounded-2xl border-2 border-border bg-card p-5 text-left hover:border-primary/50 hover:shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl leading-none">📖</span>
              <div>
                <p className="text-base font-semibold text-foreground">Pick a recipe</p>
                <p className="text-sm text-muted-foreground mt-0.5">From your saved recipes</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-muted-foreground/50 shrink-0" />
            </div>
          </button>

          <button
            onClick={() => setMode('edit')}
            className="w-full rounded-2xl border-2 border-border bg-card p-5 text-left hover:border-primary/50 hover:shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl leading-none">✏️</span>
              <div>
                <p className="text-base font-semibold text-foreground">Just name a meal</p>
                <p className="text-sm text-muted-foreground mt-0.5">Type any meal name</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-muted-foreground/50 shrink-0" />
            </div>
          </button>

          <button
            onClick={() => setMode('ai')}
            className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-left hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl leading-none">✨</span>
              <div>
                <p className="text-base font-semibold text-foreground">Create with AI</p>
                <p className="text-sm text-muted-foreground mt-0.5">Get ingredients looked up for you</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-muted-foreground/50 shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* ── Recipe list ── */}
      {mode === 'recipe-list' && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-lg mx-auto w-full">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {yourRecipes.length > 0 && filterRecipes(yourRecipes).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  Your recipes
                </p>
                <div className="space-y-2">
                  {filterRecipes(yourRecipes).map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRecipe(r)}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 hover:shadow-sm active:scale-[0.99] transition-all flex items-center gap-3"
                    >
                      <span className="text-xl shrink-0">{mealEmoji(r.title)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                        {r.ingredients.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={15} className="shrink-0 text-muted-foreground/40" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {starterRecipes.length > 0 && filterRecipes(starterRecipes).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  Starter recipes
                </p>
                <div className="space-y-2">
                  {filterRecipes(starterRecipes).map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRecipe(r)}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 hover:shadow-sm active:scale-[0.99] transition-all flex items-center gap-3"
                    >
                      <span className="text-xl shrink-0">{mealEmoji(r.title)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                        {r.ingredients.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={15} className="shrink-0 text-muted-foreground/40" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filterRecipes([...yourRecipes, ...starterRecipes]).length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <UtensilsCrossed size={32} strokeWidth={1.25} />
                <p className="text-sm">No recipes found</p>
              </div>
            )}

            <div className="h-4" />
          </div>
        </div>
      )}

      {/* ── AI ── */}
      {mode === 'ai' && (
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
          <div className="flex gap-2">
            <input
              className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Chicken Tikka Masala"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAILookup() }}
              autoFocus
            />
            <button
              onClick={() => void handleAILookup()}
              disabled={aiSearching || !aiQuery.trim()}
              className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-opacity"
            >
              {aiSearching ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Look up'}
            </button>
          </div>

          {aiError && <p className="text-sm text-destructive">{aiError}</p>}

          {aiIngredients.length > 0 && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipe name</p>
                <input
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={aiTitle}
                  onChange={e => setAiTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ingredients</p>
                <div className="space-y-1.5">
                  {aiIngredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        className="flex-1 h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={ing.name}
                        onChange={e => setAiIngredients(prev => prev.map((i, j) => j === idx ? { ...i, name: e.target.value } : i))}
                        placeholder="Ingredient"
                      />
                      <input
                        className="w-20 h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={ing.quantity}
                        onChange={e => setAiIngredients(prev => prev.map((i, j) => j === idx ? { ...i, quantity: e.target.value } : i))}
                        placeholder="Qty"
                      />
                      <button
                        onClick={() => setAiIngredients(prev => prev.filter((_, j) => j !== idx))}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setAiIngredients(prev => [...prev, { name: '', quantity: '' }])}
                    className="flex items-center gap-1.5 text-sm text-primary font-medium pt-0.5"
                  >
                    <Plus size={14} /> Add ingredient
                  </button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => void handleAISave()}
                disabled={aiSaving || !aiTitle.trim()}
              >
                {aiSaving
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Saving…</span>
                  : 'Save recipe & plan meal'
                }
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Edit / confirm ── */}
      {mode === 'edit' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">

          {/* Selected recipe chip */}
          {selectedRecipe && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 rounded-2xl">
              <span className="text-xl shrink-0">{mealEmoji(selectedRecipe.title)}</span>
              <p className="text-sm font-semibold text-primary flex-1 truncate">{selectedRecipe.title}</p>
              <button
                onClick={() => { setRecipeId(null); setAddToShopping(false) }}
                className="text-muted-foreground hover:text-foreground transition-colors text-base leading-none shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mealTitle">Meal name</Label>
            <Input
              id="mealTitle"
              placeholder="e.g. Spaghetti bolognese"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSave() } }}
              autoFocus={!selectedRecipe}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mealNotes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="mealNotes"
              placeholder="e.g. Double the sauce, use wholemeal pasta"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {selectedRecipe && selectedRecipe.ingredients.length > 0 && (
            <button
              onClick={() => setAddToShopping(v => !v)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                addToShopping ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                addToShopping ? 'bg-primary border-primary' : 'border-border',
              )}>
                {addToShopping && <Check size={12} strokeWidth={3} className="text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <ShoppingCart size={14} className="shrink-0" />
                  Add ingredients to shopping list
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRecipe.ingredients.length} ingredient{selectedRecipe.ingredients.length !== 1 ? 's' : ''} · quantities merged if already on list
                </p>
              </div>
            </button>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            {isEditing && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0"
              >
                <Trash2 size={16} />
              </Button>
            )}
            <Button className="flex-1" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : isEditing ? 'Update' : 'Save meal'}
            </Button>
          </div>

          <div className="h-6" />
        </div>
      )}
    </div>
  )
}

// ── Meals page ─────────────────────────────────────────────────

export default function MealsPage() {
  const navigate     = useNavigate()
  const { household } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const [weekOffset,    setWeekOffset]    = useState(0)
  const [selectedDate,  setSelectedDate]  = useState<Date | null>(null)

  const today     = startOfDay(new Date())
  const baseStart = getWeekStart(today, weekStartDay)
  const weekStart = addDays(baseStart, weekOffset * 7)
  const weekEnd   = addDays(weekStart, 6)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  const { meals, saveMeal, deleteMeal } = useMealPlans(days)
  const { recipes }                     = useRecipes()

  function mealForDay(day: Date) {
    return meals.find(m => m.date === toDateString(day))
  }

  const activeMeal = selectedDate ? mealForDay(selectedDate) : undefined

  async function handleSave(
    title: string,
    notes: string,
    recipeId: string | null,
    addToShopping: boolean,
    recipe: Recipe | null,
  ) {
    if (!selectedDate || !household) return
    await saveMeal(toDateString(selectedDate), title, notes, activeMeal?.id, recipeId)

    if (addToShopping && recipe && recipe.ingredients.length > 0) {
      const { data: existing } = await supabase
        .from('shopping_items')
        .select('id, name, quantity')
        .eq('household_id', household.id)
        .eq('checked', false)

      const existingMap = new Map(
        (existing ?? []).map((i: { id: string; name: string; quantity: string | null }) =>
          [i.name.toLowerCase(), i]
        )
      )

      const toInsert: { household_id: string; name: string; quantity: string | null; category: string }[] = []
      const toUpdate: { id: string; quantity: string }[] = []

      for (const ing of recipe.ingredients) {
        const match = existingMap.get(ing.name.toLowerCase())
        if (match) {
          toUpdate.push({ id: match.id, quantity: mergeQuantity(match.quantity, ing.quantity) })
        } else {
          toInsert.push({
            household_id: household.id,
            name: ing.name,
            quantity: ing.quantity ?? null,
            category: categorise(ing.name),
          })
        }
      }

      if (toInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('shopping_items').insert(toInsert as any)
      }
      for (const u of toUpdate) {
        await supabase.from('shopping_items').update({ quantity: u.quantity }).eq('id', u.id)
      }
    }
  }

  async function handleDelete() {
    if (activeMeal) await deleteMeal(activeMeal.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Week nav header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-2 h-14 max-w-lg mx-auto">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-foreground leading-tight">
              {formatWeekRange(weekStart, weekEnd)}
            </p>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline font-semibold">
                This week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Day cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-w-lg mx-auto w-full">
        {/* Recipes entry point */}
        <button
          onClick={() => navigate('/recipes')}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 hover:shadow-md active:scale-[0.99] transition-all text-left"
        >
          <ChefHat size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">Recipes</span>
          <ChevronRight size={15} className="text-muted-foreground/50 shrink-0" />
        </button>
        {days.map(day => (
          <MealCard
            key={day.toISOString()}
            date={day}
            isToday={isSameDay(day, today)}
            isPast={day < today && !isSameDay(day, today)}
            meal={mealForDay(day)}
            onTap={() => setSelectedDate(day)}
          />
        ))}
        <div className="h-4" />
      </div>

      {/* Full-screen picker */}
      {selectedDate && (
        <MealPicker
          key={selectedDate.toISOString()}
          date={selectedDate}
          meal={activeMeal}
          recipes={recipes}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
