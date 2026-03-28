import { useState } from 'react'
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
import { ChevronLeft, ChevronRight, UtensilsCrossed, Pencil, Trash2, ShoppingCart, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

// ── Food emoji helper ──────────────────────────────────────────

function mealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (/pasta|spaghetti|lasagne|penne|mac.*cheese|linguine|fettuccine/.test(t)) return '🍝'
  if (/pizza/.test(t)) return '🍕'
  if (/burger/.test(t)) return '🍔'
  if (/taco|fajita|nacho/.test(t)) return '🌮'
  if (/curry|tikka|masala|butter chicken/.test(t)) return '🍛'
  if (/soup/.test(t)) return '🍲'
  if (/salad/.test(t)) return '🥗'
  if (/salmon|prawn|fish|seafood|teriyaki/.test(t)) return '🐟'
  if (/stir.fry|fried rice|noodle/.test(t)) return '🍜'
  if (/roast|schnitzel|chop|lamb/.test(t)) return '🍖'
  if (/chicken/.test(t)) return '🍗'
  if (/beef|steak|mince/.test(t)) return '🥩'
  if (/sausage|snag/.test(t)) return '🌭'
  if (/egg|quiche/.test(t)) return '🥚'
  if (/rice/.test(t)) return '🍚'
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
            <span className="text-3xl font-black text-primary-foreground leading-none">
              {date.getDate()}
            </span>
            <span className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider">
              {DAY_SHORT[date.getDay()]}
            </span>
          </div>
          <span className="ml-auto text-xs font-black text-primary-foreground/70 uppercase tracking-widest">
            Tonight
          </span>
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3 min-h-[64px]">
          {meal ? (
            <>
              <span className="text-2xl shrink-0">{mealEmoji(meal.title)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground truncate">{meal.title}</p>
                {meal.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.notes}</p>
                )}
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
      {/* Left date column */}
      <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4 gap-0.5 bg-muted/40 border-r border-border">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {DAY_SHORT[date.getDay()]}
        </span>
        <span className="text-2xl font-black leading-none text-foreground">
          {date.getDate()}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3 flex items-center gap-3 min-h-[72px]">
        {meal ? (
          <>
            <span className="text-xl shrink-0">{mealEmoji(meal.title)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{meal.title}</p>
              {meal.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.notes}</p>
              )}
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

// ── Recipe picker ──────────────────────────────────────────────

function RecipePicker({
  recipes,
  selectedId,
  onSelect,
}: {
  recipes: Recipe[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  if (recipes.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label>Use a recipe <span className="text-muted-foreground font-normal">(optional)</span></Label>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {recipes.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect(selectedId === r.id ? null : r.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
              selectedId === r.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-foreground border-border hover:border-primary/50',
            )}
          >
            {r.title}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Meal edit sheet ────────────────────────────────────────────

interface MealSheetProps {
  date: Date | null
  meal: MealPlan | undefined
  recipes: Recipe[]
  onSave: (title: string, notes: string, recipeId: string | null, addToShopping: boolean, recipe: Recipe | null) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

function MealSheet({ date, meal, recipes, onSave, onDelete, onClose }: MealSheetProps) {
  const [title, setTitle]           = useState(meal?.title ?? '')
  const [notes, setNotes]           = useState(meal?.notes ?? '')
  const [recipeId, setRecipeId]     = useState<string | null>(meal?.recipe_id ?? null)
  const [addToShopping, setAddToShopping] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [addedCount, setAddedCount] = useState<number | null>(null)

  const dateKey = date?.toISOString()

  const selectedRecipe = recipeId ? recipes.find(r => r.id === recipeId) ?? null : null

  function handleSelectRecipe(id: string | null) {
    const prevRecipe = recipeId ? recipes.find(r => r.id === recipeId) : null
    setRecipeId(id)
    setAddedCount(null)
    if (id) {
      const r = recipes.find(rec => rec.id === id)
      const titleMatchesPrev = prevRecipe && title.trim().toLowerCase() === prevRecipe.title.toLowerCase()
      if (r && (!title.trim() || titleMatchesPrev)) setTitle(r.title)
      if (r && r.ingredients.length > 0) setAddToShopping(true)
    } else {
      setAddToShopping(false)
    }
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

  if (!date) return null

  const dateLabel = `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`

  return (
    <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-5 max-w-lg mx-auto max-h-[92dvh] overflow-y-auto">
      <SheetHeader className="mb-4 text-left">
        <SheetTitle>{meal ? 'Edit meal' : 'Plan a meal'}</SheetTitle>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </SheetHeader>

      <div className="space-y-4">
        <RecipePicker
          recipes={recipes}
          selectedId={recipeId}
          onSelect={handleSelectRecipe}
          key={dateKey}
        />

        <div className="space-y-1.5">
          <Label htmlFor="mealTitle">What's for dinner?</Label>
          <Input
            id="mealTitle"
            placeholder="e.g. Spaghetti bolognese"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }}
            autoFocus
            key={dateKey}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mealNotes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="mealNotes"
            placeholder="e.g. Double the sauce, use wholemeal pasta"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Add to shopping toggle — only when recipe with ingredients is selected */}
        {selectedRecipe && selectedRecipe.ingredients.length > 0 && (
          <button
            onClick={() => setAddToShopping(v => !v)}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              addToShopping
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/30',
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

        {addedCount !== null && (
          <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
            {addedCount === 0
              ? 'All ingredients already on your list.'
              : `${addedCount} ingredient${addedCount !== 1 ? 's' : ''} added to your shopping list.`}
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          {meal && (
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
            ) : meal ? 'Update' : 'Save meal'}
          </Button>
        </div>
      </div>
    </SheetContent>
  )
}

// ── Meals page ─────────────────────────────────────────────────

export default function MealsPage() {
  const { household } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const today     = startOfDay(new Date())
  const baseStart = getWeekStart(today, weekStartDay)
  const weekStart = addDays(baseStart, weekOffset * 7)
  const weekEnd   = addDays(weekStart, 6)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  const { meals, saveMeal, deleteMeal } = useMealPlans(days)
  const { recipes } = useRecipes()

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
          toUpdate.push({
            id: match.id,
            quantity: mergeQuantity(match.quantity, ing.quantity),
          })
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
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-primary hover:underline font-semibold"
              >
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

      {/* Edit sheet */}
      <Sheet open={!!selectedDate} onOpenChange={open => { if (!open) setSelectedDate(null) }}>
        <MealSheet
          key={selectedDate?.toISOString() ?? ''}
          date={selectedDate}
          meal={activeMeal}
          recipes={recipes}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedDate(null)}
        />
      </Sheet>
    </div>
  )
}
