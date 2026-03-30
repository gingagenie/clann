import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks, type WeekTask } from '@/hooks/useWeekTasks'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useShoppingList } from '@/hooks/useShoppingList'
import {
  startOfDay, addDays, isSameDay, getWeekStart,
  toDateString, formatWeekRange, DAY_SHORT, MONTHS,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Check, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Helpers ─────────────────────────────────────────────────────

function mealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (/pasta|spagh|penne|fettuc|lasagn|ragu/.test(t))          return '🍝'
  if (/pizza/.test(t))                                          return '🍕'
  if (/burger|pulled.?pork/.test(t))                           return '🍔'
  if (/taco|burrito|quesadilla|mexican|nacho/.test(t))         return '🌮'
  if (/stir.?fry|noodle|fried rice|ramen|udon|pho|pad thai/.test(t)) return '🍜'
  if (/sushi|sashimi/.test(t))                                 return '🍣'
  if (/curry/.test(t))                                         return '🍛'
  if (/soup|stew|chowder|broth/.test(t))                       return '🍲'
  if (/salad/.test(t))                                         return '🥗'
  if (/salmon|tuna|cod|prawn|seafood|shrimp/.test(t))          return '🐟'
  if (/chicken/.test(t))                                       return '🍗'
  if (/steak|roast|lamb|pork/.test(t))                         return '🥩'
  if (/egg|omelette|frittata/.test(t))                         return '🍳'
  if (/rice/.test(t))                                          return '🍚'
  if (/sandwich|toast/.test(t))                                return '🥪'
  if (/wrap/.test(t))                                          return '🌯'
  return '🍽️'
}

function timeGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Hey'
}

// ── Shopping snapshot ───────────────────────────────────────────

interface ShoppingSnapshotProps {
  items: { id: string; name: string; checked: boolean }[]
  onViewAll: () => void
}

function ShoppingSnapshot({ items, onViewAll }: ShoppingSnapshotProps) {
  const unchecked = items.filter(i => !i.checked)

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart size={15} className="text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shopping list</p>
        </div>
        <button onClick={onViewAll} className="text-xs font-semibold text-primary hover:underline">
          View all
        </button>
      </div>
      <div className="px-4 py-3">
        {unchecked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the list</p>
        ) : (
          <div className="space-y-1.5">
            {unchecked.slice(0, 4).map(item => (
              <p key={item.id} className="text-sm text-foreground">{item.name}</p>
            ))}
            {unchecked.length > 4 && (
              <p className="text-xs text-muted-foreground">+{unchecked.length - 4} more</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Task row ───────────────────────────────────────────────────

function TaskRow({ task, onToggle }: { task: WeekTask; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-3 w-full text-left group py-0.5">
      <span className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
        task.completed
          ? 'bg-primary border-primary'
          : 'border-primary/40 group-hover:border-primary',
      )}>
        {task.completed && <Check size={10} strokeWidth={3.5} className="text-primary-foreground" />}
      </span>
      <span className={cn(
        'text-sm leading-snug transition-colors',
        task.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium',
      )}>
        {task.name}
      </span>
    </button>
  )
}

// ── Compact day row ─────────────────────────────────────────────

interface CompactDayRowProps {
  date: Date
  isPast: boolean
  meal: { title: string } | null
  tasks: WeekTask[]
  onToggleTask: (id: string, completed: boolean) => void
}

function CompactDayRow({ date, isPast, meal, tasks }: CompactDayRowProps) {
  const incomplete = tasks.filter(t => !t.completed).length
  const allDone    = tasks.length > 0 && incomplete === 0

  return (
    <div className={cn(
      'rounded-2xl border border-border bg-card shadow-sm',
      isPast && 'opacity-50',
    )}>
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Date */}
        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
            {DAY_SHORT[date.getDay()]}
          </p>
          <p className="text-xl font-black leading-none text-foreground">{date.getDate()}</p>
        </div>

        <div className="w-px self-stretch bg-border shrink-0" />

        {/* Meal */}
        <div className="flex-1 min-w-0">
          {meal ? (
            <p className="text-sm font-medium text-foreground truncate">
              <span className="mr-1.5">{mealEmoji(meal.title)}</span>{meal.title}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/40">No dinner planned</p>
          )}
        </div>

        {/* Task badge */}
        {tasks.length > 0 && (
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
            allDone
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}>
            {allDone ? '✓' : `${incomplete} task${incomplete !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Home page ──────────────────────────────────────────────────

export default function HomePage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { household, members } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const [weekOffset, setWeekOffset] = useState(0)

  const today         = startOfDay(new Date())
  const baseStart     = getWeekStart(today, weekStartDay)
  const weekStart     = addDays(baseStart, weekOffset * 7)
  const weekEnd       = addDays(weekStart, 6)
  const days          = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  const { tasks, toggleComplete } = useWeekTasks(days)
  const { meals }                 = useMealPlans(days)
  const { items: shoppingItems }  = useShoppingList()

  const myMember  = members.find(m => m.auth_user_id === user?.id)
  const firstName = myMember?.name?.split(' ')[0] ?? ''

  function tasksForDay(day: Date) {
    return tasks.filter(t => t.due_date === toDateString(day))
  }

  function mealForDay(day: Date) {
    return meals.find(m => m.date === toDateString(day)) ?? null
  }

  const todayTasks = tasksForDay(today)
  const todayMeal  = mealForDay(today)
  const otherDays  = days.filter(d => !isSameDay(d, today))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-2 h-14 max-w-lg mx-auto">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          <div className="flex-1 text-center">
            {isCurrentWeek ? (
              <p className="text-sm font-bold text-foreground tracking-tight">This week</p>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground tracking-tight">
                  {formatWeekRange(weekStart, weekEnd)}
                </p>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Back to this week
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 max-w-lg mx-auto w-full">
        {isCurrentWeek ? (
          <>
            {/* Greeting */}
            {firstName && (
              <div className="px-1 pt-1 pb-0.5">
                <p className="text-xl font-bold text-foreground">
                  {timeGreeting(new Date().getHours())}, {firstName} 👋
                </p>
              </div>
            )}

            {/* Today hero card */}
            <div className="rounded-2xl overflow-hidden shadow-md border border-primary/20 bg-card">
              {/* Green header */}
              <div className="bg-primary px-4 py-3 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary-foreground leading-none">
                    {today.getDate()}
                  </span>
                  <span className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider">
                    {DAY_SHORT[today.getDay()]}
                  </span>
                  <span className="text-sm text-primary-foreground/60 ml-1">
                    {MONTHS[today.getMonth()]}
                  </span>
                </div>
                <span className="text-xs font-black text-primary-foreground/70 uppercase tracking-widest">
                  Today
                </span>
              </div>

              {/* Dinner */}
              <div className="px-4 pt-3 pb-3 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Tonight's dinner
                </p>
                {todayMeal ? (
                  <p className="text-base font-semibold text-foreground">
                    <span className="mr-1.5">{mealEmoji(todayMeal.title)}</span>
                    {todayMeal.title}
                  </p>
                ) : (
                  <button
                    onClick={() => navigate('/meals')}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Nothing planned —{' '}
                    <span className="font-semibold text-primary">tap to add →</span>
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="px-4 pt-3 pb-3 space-y-2 min-h-[60px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Tasks today
                </p>
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing on — enjoy it 🌿</p>
                ) : (
                  todayTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleComplete(task.id, task.completed)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Rest of the week */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pt-1">
              Rest of the week
            </p>
            {otherDays.map(day => (
              <CompactDayRow
                key={day.toISOString()}
                date={day}
                isPast={day < today}
                meal={mealForDay(day)}
                tasks={tasksForDay(day)}
                onToggleTask={toggleComplete}
              />
            ))}

            {/* Shopping snapshot */}
            <ShoppingSnapshot items={shoppingItems} onViewAll={() => navigate('/shopping')} />
          </>
        ) : (
          // Other weeks — all 7 as compact rows
          days.map(day => (
            <CompactDayRow
              key={day.toISOString()}
              date={day}
              isPast={day < today}
              meal={mealForDay(day)}
              tasks={tasksForDay(day)}
              onToggleTask={toggleComplete}
            />
          ))
        )}

        <div className="h-4" />
      </div>

      {/* FAB */}
      <div className="fixed bottom-[4.5rem] right-4 z-20">
        <Button
          size="icon"
          className="w-13 h-13 rounded-full shadow-lg shadow-primary/30"
          onClick={() => navigate('/tasks/add')}
          aria-label="Add recurring task"
        >
          <Plus size={22} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  )
}
