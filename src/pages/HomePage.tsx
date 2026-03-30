import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks } from '@/hooks/useWeekTasks'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useShoppingList } from '@/hooks/useShoppingList'
import {
  startOfDay, addDays, getWeekStart,
  toDateString, DAY_SHORT, MONTHS,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { CalendarDays, UtensilsCrossed, ListTodo, ShoppingCart } from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────

function mealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (/pasta|spagh|penne|fettuc|lasagn|ragu/.test(t))               return '🍝'
  if (/pizza/.test(t))                                               return '🍕'
  if (/burger|pulled.?pork/.test(t))                                 return '🍔'
  if (/taco|burrito|quesadilla|mexican|nacho/.test(t))               return '🌮'
  if (/stir.?fry|noodle|fried rice|ramen|udon|pho|pad thai/.test(t)) return '🍜'
  if (/sushi|sashimi/.test(t))                                       return '🍣'
  if (/curry/.test(t))                                               return '🍛'
  if (/soup|stew|chowder|broth/.test(t))                             return '🍲'
  if (/salad/.test(t))                                               return '🥗'
  if (/salmon|tuna|cod|prawn|seafood|shrimp/.test(t))                return '🐟'
  if (/chicken/.test(t))                                             return '🍗'
  if (/steak|roast|lamb|pork/.test(t))                               return '🥩'
  if (/egg|omelette|frittata/.test(t))                               return '🍳'
  if (/rice/.test(t))                                                return '🍚'
  if (/sandwich|toast/.test(t))                                      return '🥪'
  if (/wrap/.test(t))                                                return '🌯'
  return '🍽️'
}

function timeGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Hey'
}

// ── Day label helper ─────────────────────────────────────────────

function dayLabel(dateStr: string, todayStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const t = new Date(todayStr + 'T00:00:00')
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return DAY_SHORT[d.getDay()]
}

// ── Home page ──────────────────────────────────────────────────

export default function HomePage() {
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { household, members } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const now       = new Date()
  const today     = startOfDay(now)
  const weekStart = getWeekStart(today, weekStartDay)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { tasks }                = useWeekTasks(days)
  const { meals }                = useMealPlans(days)
  const { items: shoppingItems } = useShoppingList()

  const myMember  = members.find(m => m.auth_user_id === user?.id)
  const firstName = myMember?.name?.split(' ')[0] ?? ''

  const todayStr   = toDateString(today)
  const todayTasks = tasks.filter(t => t.due_date === todayStr)
  const todayDone  = todayTasks.filter(t => t.completed).length
  const todayMeal  = meals.find(m => m.date === todayStr) ?? null

  // Next incomplete task from today onwards
  const nextTask = tasks
    .filter(t => !t.completed && t.due_date >= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

  const uncheckedCount = shoppingItems.filter(i => !i.checked).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4">

        {/* Greeting */}
        <div className="pt-8 pb-5">
          <p className="text-3xl font-bold text-foreground leading-tight">
            {timeGreeting(now.getHours())}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <p className="text-sm text-muted-foreground mt-1">Here's your day at a glance</p>
        </div>

        {/* 2 × 2 grid */}
        <div className="grid grid-cols-2 gap-3">

          {/* ── Today ── */}
          <button
            onClick={() => navigate('/tasks')}
            className="group relative rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform text-left"
            style={{ background: 'linear-gradient(145deg, #2d6a4f, #40916c)' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <CalendarDays size={16} className="text-white/60 mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Today</span>
              </div>
              <div className="mt-auto">
                <p className="text-5xl font-black text-white leading-none">{today.getDate()}</p>
                <p className="text-sm font-bold text-white/80 uppercase tracking-wide mt-0.5">
                  {DAY_SHORT[today.getDay()]} · {MONTHS[today.getMonth()]}
                </p>
                <p className={cn(
                  'text-xs font-semibold mt-2 px-2 py-0.5 rounded-full inline-block',
                  todayTasks.length === 0
                    ? 'bg-white/10 text-white/60'
                    : todayDone === todayTasks.length
                      ? 'bg-white/20 text-white'
                      : 'bg-white/15 text-white',
                )}>
                  {todayTasks.length === 0
                    ? 'No tasks'
                    : todayDone === todayTasks.length
                      ? `${todayTasks.length} done ✓`
                      : `${todayDone}/${todayTasks.length} done`}
                </p>
              </div>
            </div>
          </button>

          {/* ── Tonight's Dinner ── */}
          <button
            onClick={() => navigate('/meals')}
            className="group relative rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform text-left"
            style={{ background: 'linear-gradient(145deg, #fdf6ec, #fcecd6)' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <UtensilsCrossed size={16} className="text-amber-400 mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Dinner</span>
              </div>
              <div className="mt-auto">
                {todayMeal ? (
                  <>
                    <p className="text-4xl leading-none">{mealEmoji(todayMeal.title)}</p>
                    <p className="text-sm font-bold text-stone-800 mt-2 leading-snug line-clamp-2">
                      {todayMeal.title}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl leading-none">🍽️</p>
                    <p className="text-sm font-semibold text-stone-400 mt-2">Not planned yet</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* ── Tasks ── */}
          <button
            onClick={() => navigate('/tasks')}
            className="group relative rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform text-left"
            style={{ background: 'linear-gradient(145deg, #f0faf4, #daf0e4)' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <ListTodo size={16} className="text-emerald-500 mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Tasks</span>
              </div>
              <div className="mt-auto">
                {nextTask ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 mb-1">
                      {dayLabel(nextTask.due_date, todayStr)}
                    </p>
                    <p className="text-sm font-bold text-stone-800 leading-snug line-clamp-3">
                      {nextTask.name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl leading-none">✅</p>
                    <p className="text-sm font-bold text-stone-500 mt-2">All clear</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* ── Shopping ── */}
          <button
            onClick={() => navigate('/shopping')}
            className="group relative rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform text-left"
            style={{ background: 'linear-gradient(145deg, #fdf6ec, #fcecd6)' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <ShoppingCart size={16} className="text-amber-400 mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Shopping</span>
              </div>
              <div className="mt-auto">
                {uncheckedCount === 0 ? (
                  <>
                    <p className="text-3xl leading-none">🛒</p>
                    <p className="text-sm font-bold text-stone-500 mt-2">Nothing needed</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-black leading-none" style={{ color: '#b45309' }}>
                      {uncheckedCount}
                    </p>
                    <p className="text-sm font-bold text-stone-500 mt-1">
                      {uncheckedCount === 1 ? 'item to get' : 'items to get'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </button>

        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}
