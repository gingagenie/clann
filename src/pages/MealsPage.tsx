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
import { ChevronLeft, ChevronRight, UtensilsCrossed, Pencil, Trash2, ShoppingCart, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

// ── Meal day card ──────────────────────────────────────────────

interface MealCardProps {
  date: Date
  isToday: boolean
  isPast: boolean
  meal: MealPlan | undefined
  onTap: () => void
}

function MealCard({ date, isToday, isPast, meal, onTap }: MealCardProps) {
  return (
    <button
      onClick={onTap}
      className={cn(
        'flex w-full rounded-xl border overflow-hidden text-left transition-all active:scale-[0.99]',
        isToday  ? 'border-primary border-[1.5px]' : 'border-border',
        isPast   ? 'opacity-55' : 'hover:border-primary/40',
      )}
    >
      {/* Left date column */}
      <div className={cn(
        'w-16 shrink-0 flex flex-col items-center justify-center py-4 gap-0.5',
        isToday ? 'bg-primary' : 'bg-muted/40 border-r border-border',
      )}>
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wide',
          isToday ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}>
          {DAY_SHORT[date.getDay()]}
        </span>
        <span className={cn(
          'text-2xl font-extrabold leading-none',
          isToday ? 'text-primary-foreground' : 'text-foreground',
        )}>
          {date.getDate()}
        </span>
        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 mt-1" />}
      </div>

      {/* Body */}
      <div className="flex-1 px-3.5 py-3 flex items-center gap-3 min-h-[72px]">
        {meal ? (
          <div className="flex-1 min-w-0">
            {isToday && (
              <span className="text-[11px] font-bold text-primary uppercase tracking-wide block mb-1">
                Tonight
              </span>
            )}
            <p className="font-semibold text-foreground truncate">{meal.title}</p>
            {meal.notes && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{meal.notes}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <UtensilsCrossed size={16} className="shrink-0" />
            <span className="text-sm">{isToday ? 'What\'s for dinner?' : 'Plan a meal'}</span>
          </div>
        )}
        {meal && (
          <Pencil size={14} className="shrink-0 text-muted-foreground/50" />
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
                {selectedRecipe.ingredients.length} ingredient{selectedRecipe.ingredients.length !== 1 ? 's' : ''} · duplicates skipped
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

      const toInsert: { household_id: string; name: string; quantity: string | null }[] = []
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
          })
        }
      }

      if (toInsert.length > 0) {
        await supabase.from('shopping_items').insert(toInsert)
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
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center px-2 h-14 max-w-lg mx-auto">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                className="text-xs text-primary hover:underline font-medium"
              >
                This week
              </button>
            )}
          </div>

          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
