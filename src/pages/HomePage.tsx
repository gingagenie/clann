import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks, type WeekTask } from '@/hooks/useWeekTasks'
import {
  startOfDay, addDays, isSameDay, getWeekStart,
  toDateString, formatWeekRange, DAY_SHORT,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Task row ───────────────────────────────────────────────────

function TaskRow({ task, onToggle }: { task: WeekTask; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2.5 w-full text-left group py-0.5"
    >
      <span className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        task.completed
          ? 'bg-green-500 border-green-500'
          : 'border-muted-foreground/40 group-hover:border-primary/60'
      )}>
        {task.completed && <Check size={11} strokeWidth={3} className="text-white" />}
      </span>
      <span className={cn(
        'text-sm transition-colors',
        task.completed
          ? 'line-through text-muted-foreground'
          : 'text-foreground'
      )}>
        {task.name}
      </span>
    </button>
  )
}

// ── Day card ───────────────────────────────────────────────────

interface DayCardProps {
  date: Date
  isToday: boolean
  isPast: boolean
  tasks: WeekTask[]
  onToggleTask: (id: string, completed: boolean) => void
}

function DayCard({ date, isToday, isPast, tasks, onToggleTask }: DayCardProps) {
  return (
    <div className={cn(
      'flex rounded-xl border overflow-hidden transition-opacity',
      isToday  ? 'border-primary border-[1.5px]' : 'border-border',
      isPast   && 'opacity-55',
    )}>
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
        {isToday && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 mt-1" />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-3.5 py-3 space-y-1.5 min-h-[72px]">
        {isToday && (
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide block mb-2">
            Today
          </span>
        )}
        {tasks.length === 0
          ? <span className="text-sm text-muted-foreground">No tasks</span>
          : tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => onToggleTask(task.id, task.completed)}
              />
            ))
        }
      </div>
    </div>
  )
}

// ── Home page ──────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const { household } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const [weekOffset, setWeekOffset] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const today     = startOfDay(new Date())
  const baseStart = getWeekStart(today, weekStartDay)
  const weekStart = addDays(baseStart, weekOffset * 7)
  const weekEnd   = addDays(weekStart, 6)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  const { tasks, toggleComplete } = useWeekTasks(days)

  // Scroll to today on current week
  useEffect(() => {
    if (!isCurrentWeek || !listRef.current) return
    const todayIndex = days.findIndex(d => isSameDay(d, today))
    if (todayIndex > 0) {
      setTimeout(() => {
        const card = listRef.current?.children[todayIndex] as HTMLElement
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [weekOffset])

  function tasksForDay(day: Date) {
    const ds = toDateString(day)
    return tasks.filter(t => t.due_date === ds)
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
                Back to this week
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
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-w-lg mx-auto w-full">
        {days.map(day => (
          <DayCard
            key={day.toISOString()}
            date={day}
            isToday={isSameDay(day, today)}
            isPast={day < today && !isSameDay(day, today)}
            tasks={tasksForDay(day)}
            onToggleTask={toggleComplete}
          />
        ))}

        {/* Bottom padding so last card clears the FAB */}
        <div className="h-4" />
      </div>

      {/* Floating add button */}
      <div className="fixed bottom-[4.5rem] right-4 z-20">
        <Button
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={() => navigate('/tasks/add')}
          aria-label="Add recurring task"
        >
          <Plus size={22} />
        </Button>
      </div>
    </div>
  )
}
