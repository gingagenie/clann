import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks, type WeekTask } from '@/hooks/useWeekTasks'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useShoppingList } from '@/hooks/useShoppingList'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import {
  startOfDay, addDays, isSameDay, getWeekStart,
  toDateString, DAY_SHORT, MONTHS,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Check, ShoppingCart, Bell } from 'lucide-react'

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
  taskCount: number
  incompleteCount: number
}

function CompactDayRow({ date, isPast, meal, taskCount, incompleteCount }: CompactDayRowProps) {
  const allDone = taskCount > 0 && incompleteCount === 0

  return (
    <div className={cn(
      'rounded-2xl border border-border bg-card shadow-sm',
      isPast && 'opacity-40',
    )}>
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
            {DAY_SHORT[date.getDay()]}
          </p>
          <p className="text-xl font-black leading-none text-foreground">{date.getDate()}</p>
        </div>

        <div className="w-px self-stretch bg-border shrink-0" />

        <div className="flex-1 min-w-0">
          {meal ? (
            <p className="text-sm font-medium text-foreground truncate">
              <span className="mr-1.5">{mealEmoji(meal.title)}</span>{meal.title}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/40">No dinner planned</p>
          )}
        </div>

        {taskCount > 0 && (
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
            allDone ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}>
            {allDone ? '✓' : `${incompleteCount} task${incompleteCount !== 1 ? 's' : ''}`}
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
  const { enabled } = usePushNotifications()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const now       = new Date()
  const today     = startOfDay(now)
  const weekStart = getWeekStart(today, weekStartDay)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

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

  // Shopping snapshot
  const uncheckedItems = shoppingItems.filter(i => !i.checked)

  // Next reminder timing
  const next5pm = new Date(now)
  next5pm.setHours(17, 0, 0, 0)
  if (next5pm <= now) next5pm.setDate(next5pm.getDate() + 1)
  const reminderIsToday = next5pm.toDateString() === now.toDateString()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        <div className="px-4 pt-8 pb-3 space-y-4">

          {/* Greeting */}
          <div>
            <p className="text-3xl font-bold text-foreground leading-tight">
              {timeGreeting(now.getHours())}{firstName ? `, ${firstName}` : ''} 👋
            </p>
          </div>

          {/* Today hero card */}
          <div className="rounded-2xl overflow-hidden shadow-md border border-primary/20 bg-card">
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
            Rest of the week
          </p>
          {otherDays.map(day => {
            const dayTasks = tasksForDay(day)
            return (
              <CompactDayRow
                key={day.toISOString()}
                date={day}
                isPast={day < today}
                meal={mealForDay(day)}
                taskCount={dayTasks.length}
                incompleteCount={dayTasks.filter(t => !t.completed).length}
              />
            )
          })}

          {/* Shopping snapshot */}
          <button
            onClick={() => navigate('/shopping')}
            className="w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Shopping list
                </p>
              </div>
              <p className="text-xs font-semibold text-primary">View all</p>
            </div>
            <div className="px-4 py-3">
              {uncheckedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing to get</p>
              ) : (
                <div className="space-y-1.5">
                  {uncheckedItems.slice(0, 4).map(item => (
                    <p key={item.id} className="text-sm text-foreground">{item.name}</p>
                  ))}
                  {uncheckedItems.length > 4 && (
                    <p className="text-xs text-muted-foreground font-medium">
                      +{uncheckedItems.length - 4} more items
                    </p>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Next reminder — only when notifications are on */}
          {enabled && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card shadow-sm">
              <Bell size={16} className="text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Dinner reminder{' '}
                <span className="font-semibold">
                  {reminderIsToday ? 'today at 5pm' : 'tomorrow at 5pm'}
                </span>
              </p>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
