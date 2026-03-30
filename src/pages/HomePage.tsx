import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks } from '@/hooks/useWeekTasks'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useShoppingList } from '@/hooks/useShoppingList'
import {
  startOfDay, addDays, getWeekStart,
  toDateString, DAY_SHORT,
} from '@/lib/dates'
import { CalendarDays, UtensilsCrossed, ListTodo, ShoppingCart, GraduationCap } from 'lucide-react'
import { getTermStatus } from '@/lib/schoolTerms'
import type { AustralianState } from '@/contexts/HouseholdContext'
import { MONTHS } from '@/lib/dates'

// ── School card helpers ──────────────────────────────────────────

function daysUntil(targetDateStr: string, todayStr: string): number {
  const target = new Date(targetDateStr + 'T00:00:00Z').getTime()
  const today  = new Date(todayStr    + 'T00:00:00Z').getTime()
  return Math.round((target - today) / 86400000)
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

function countdown(days: number, context: 'end' | 'start'): string {
  if (days <= 0) return context === 'end' ? 'Last day! 🎉' : 'Starts today!'
  if (days === 1) return context === 'end' ? '1 day to go' : 'Tomorrow!'
  if (days <= 14) return `${days} days to go`
  return `${Math.floor(days / 7)} weeks to go`
}

// ── Helpers ─────────────────────────────────────────────────────

function mealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (/pasta|spagh|penne|lasagne/.test(t))              return '🍝'
  if (/pizza/.test(t))                                  return '🍕'
  if (/burger/.test(t))                                 return '🍔'
  if (/taco|fajita|nacho/.test(t))                      return '🌮'
  if (/curry|tikka|masala|butter chicken/.test(t))      return '🍛'
  if (/soup/.test(t))                                   return '🍲'
  if (/salad/.test(t))                                  return '🥗'
  if (/salmon|prawn|fish|seafood|teriyaki/.test(t))     return '🐟'
  if (/stir.fry|fried rice|noodle/.test(t))             return '🍜'
  if (/roast|schnitzel|chop|lamb/.test(t))              return '🍖'
  if (/chicken/.test(t))                                return '🍗'
  if (/beef|steak|mince/.test(t))                       return '🥩'
  if (/sausage|snag/.test(t))                           return '🌭'
  if (/egg|quiche/.test(t))                             return '🥚'
  if (/rice/.test(t))                                   return '🍚'
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
  const termStatus = household?.state
    ? getTermStatus(household.state as AustralianState, todayStr)
    : null
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
            className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform text-left"
            style={{ background: '#f5f0e8', border: '3px solid #3a5c2e' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <CalendarDays size={16} style={{ color: '#3a5c2e' }} className="mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3a5c2e' }}>Today</span>
              </div>
              <div className="mt-auto">
                <p className="text-5xl font-black leading-none text-black">{today.getDate()}</p>
                <p className="text-sm font-bold uppercase tracking-wide mt-0.5 text-black">
                  {DAY_SHORT[today.getDay()]} · {MONTHS[today.getMonth()]}
                </p>
                <p className="text-xs font-semibold mt-2 text-black/60">
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
            className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform text-left"
            style={{ background: '#f5f0e8', border: '3px solid #3a5c2e' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <UtensilsCrossed size={16} style={{ color: '#3a5c2e' }} className="mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3a5c2e' }}>Dinner</span>
              </div>
              <div className="mt-auto">
                {todayMeal ? (
                  <>
                    <p className="text-4xl leading-none">{mealEmoji(todayMeal.title)}</p>
                    <p className="text-sm font-bold text-black mt-2 leading-snug line-clamp-2">
                      {todayMeal.title}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl leading-none">🍽️</p>
                    <p className="text-sm font-semibold text-black/40 mt-2">Not planned yet</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* ── Tasks ── */}
          <button
            onClick={() => navigate('/tasks')}
            className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform text-left"
            style={{ background: '#f5f0e8', border: '3px solid #3a5c2e' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <ListTodo size={16} style={{ color: '#3a5c2e' }} className="mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3a5c2e' }}>Tasks</span>
              </div>
              <div className="mt-auto">
                {nextTask ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#3a5c2e' }}>
                      {dayLabel(nextTask.due_date, todayStr)}
                    </p>
                    <p className="text-sm font-bold text-black leading-snug line-clamp-3">
                      {nextTask.name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl leading-none">✅</p>
                    <p className="text-sm font-bold text-black/50 mt-2">All clear</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* ── Shopping ── */}
          <button
            onClick={() => navigate('/shopping')}
            className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform text-left"
            style={{ background: '#f5f0e8', border: '3px solid #3a5c2e' }}
          >
            <div className="p-4 flex flex-col h-full min-h-[160px]">
              <div className="flex items-start justify-between">
                <ShoppingCart size={16} style={{ color: '#3a5c2e' }} className="mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3a5c2e' }}>Shopping</span>
              </div>
              <div className="mt-auto">
                {uncheckedCount === 0 ? (
                  <>
                    <p className="text-3xl leading-none">🛒</p>
                    <p className="text-sm font-bold text-black/50 mt-2">Nothing needed</p>
                  </>
                ) : (
                  <>
                    <p className="text-5xl font-black leading-none text-black">{uncheckedCount}</p>
                    <p className="text-sm font-bold text-black/60 mt-1">
                      {uncheckedCount === 1 ? 'item to get' : 'items to get'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </button>

        </div>

        {/* ── School card (full width) ── */}
        <div className="mt-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform text-left"
            style={{ background: '#f5f0e8', border: '3px solid #3a5c2e' }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} style={{ color: '#3a5c2e' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3a5c2e' }}>
                    School
                  </span>
                </div>
                {household?.state && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: '#3a5c2e', background: '#3a5c2e18' }}>
                    {household.state}
                  </span>
                )}
              </div>

              {!household?.state ? (
                // No state set
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏫</span>
                  <div>
                    <p className="text-sm font-bold text-black">Set your school state</p>
                    <p className="text-xs text-black/50 mt-0.5">Tap to go to Settings and pick your state</p>
                  </div>
                </div>
              ) : termStatus?.inTerm ? (
                // In term
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-black leading-none">Term {termStatus.termNumber}</p>
                    <p className="text-xs text-black/50 mt-1">
                      Ends {shortDate(termStatus.currentTermEnd!)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#3a5c2e' }}>
                      {countdown(daysUntil(termStatus.currentTermEnd!, todayStr), 'end')}
                    </p>
                    {termStatus.nextTermNumber && (
                      <p className="text-xs text-black/40 mt-0.5">
                        then holidays
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // In holidays
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-black leading-none">🏖️ Holidays</p>
                    {termStatus?.nextPeriodStart && (
                      <p className="text-xs text-black/50 mt-1">
                        Term {termStatus.nextTermNumber} starts {shortDate(termStatus.nextPeriodStart)}
                      </p>
                    )}
                  </div>
                  {termStatus?.nextPeriodStart && (
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#3a5c2e' }}>
                        {countdown(daysUntil(termStatus.nextPeriodStart, todayStr), 'start')}
                      </p>
                      <p className="text-xs text-black/40 mt-0.5">until school</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}
