import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useWeekTasks, type WeekTask } from '@/hooks/useWeekTasks'
import {
  startOfDay, addDays, isSameDay, getWeekStart,
  toDateString, formatWeekRange, DAY_SHORT,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import TaskEditSheet from '@/components/tasks/TaskEditSheet'
import { getTermBannerForDate } from '@/lib/schoolTerms'
import type { AustralianState } from '@/contexts/HouseholdContext'

// ── Task row ───────────────────────────────────────────────────

function TaskRow({
  task, onToggle, onEdit, isToday,
}: {
  task: WeekTask
  onToggle: () => void
  onEdit: () => void
  isToday: boolean
}) {
  return (
    <div className="flex items-center gap-3 w-full py-0.5">
      {/* Checkbox — toggles completion */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          task.completed
            ? 'bg-primary border-primary'
            : isToday
              ? 'border-primary/40'
              : 'border-border',
        )}
      >
        {task.completed && <Check size={10} strokeWidth={3.5} className="text-primary-foreground" />}
      </button>

      {/* Name — opens edit sheet */}
      <button
        onClick={e => { e.stopPropagation(); onEdit() }}
        className={cn(
          'flex-1 text-sm text-left leading-snug transition-colors',
          task.completed
            ? 'line-through text-muted-foreground'
            : isToday ? 'text-foreground font-medium' : 'text-foreground',
        )}
      >
        {task.name}
      </button>
    </div>
  )
}

// ── Day card ───────────────────────────────────────────────────

interface DayCardProps {
  date: Date
  isToday: boolean
  isPast: boolean
  tasks: WeekTask[]
  onToggleTask: (id: string, completed: boolean) => void
  onEditTask: (task: WeekTask) => void
  onTap: () => void
}

function DayCard({ date, isToday, isPast, tasks, onToggleTask, onEditTask, onTap }: DayCardProps) {
  if (isToday) {
    return (
      <div
        data-today="true"
        onClick={onTap}
        className="rounded-2xl overflow-hidden shadow-md border border-primary/20 bg-card cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary-foreground leading-none">{date.getDate()}</span>
            <span className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider">
              {DAY_SHORT[date.getDay()]}
            </span>
          </div>
          <span className="ml-auto text-xs font-black text-primary-foreground/70 uppercase tracking-widest">Today</span>
        </div>
        <div className="px-4 py-3 space-y-2 min-h-[60px]">
          {tasks.length === 0
            ? <span className="text-sm text-muted-foreground">Nothing on — enjoy it 🌿</span>
            : tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isToday
                  onToggle={() => onToggleTask(task.id, task.completed)}
                  onEdit={() => onEditTask(task)}
                />
              ))
          }
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onTap}
      className={cn(
        'rounded-2xl overflow-hidden border border-border bg-card shadow-sm transition-all cursor-pointer active:scale-[0.99]',
        isPast && 'opacity-50',
      )}
    >
      <div className="flex">
        <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4 gap-0.5 bg-muted/40 border-r border-border">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {DAY_SHORT[date.getDay()]}
          </span>
          <span className="text-2xl font-black leading-none text-foreground">{date.getDate()}</span>
        </div>
        <div className="flex-1 px-4 py-3 space-y-2 min-h-[64px]">
          {tasks.length === 0
            ? <span className="text-sm text-muted-foreground/60">No tasks</span>
            : tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isToday={false}
                  onToggle={() => onToggleTask(task.id, task.completed)}
                  onEdit={() => onEditTask(task)}
                />
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Tasks page ─────────────────────────────────────────────────

export default function TasksPage() {
  const navigate     = useNavigate()
  const { household } = useHousehold()
  const weekStartDay = household?.week_start_day ?? 'monday'

  const [weekOffset, setWeekOffset] = useState(0)
  const [editingTask, setEditingTask] = useState<WeekTask | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const today      = startOfDay(new Date())
  const baseStart  = getWeekStart(today, weekStartDay)
  const weekStart  = addDays(baseStart, weekOffset * 7)
  const weekEnd    = addDays(weekStart, 6)
  const days       = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  const { tasks, toggleComplete, refresh } = useWeekTasks(days)
  const state = household?.state as AustralianState | null | undefined

  useEffect(() => {
    if (!isCurrentWeek || !listRef.current) return
    const hasTodayCard = days.some(d => isSameDay(d, today))
    if (hasTodayCard) {
      setTimeout(() => {
        const card = listRef.current?.querySelector('[data-today="true"]') as HTMLElement
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  function tasksForDay(day: Date) {
    return tasks.filter(t => t.due_date === toDateString(day))
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
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-foreground tracking-tight">
              {formatWeekRange(weekStart, weekEnd)}
            </p>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline font-semibold">
                Back to this week
              </button>
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

      {/* Day cards */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 max-w-lg mx-auto w-full">
        <div className="space-y-2.5">
          {days.map(day => {
            const dateStr = toDateString(day)
            const banner  = state ? getTermBannerForDate(state, dateStr) : null
            return (
              <div key={day.toISOString()}>
                {banner && (
                  <div className="flex items-center gap-2 pt-1 pb-0.5 px-1">
                    <div className="h-px flex-1 bg-primary/20" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary px-2">
                      {banner}
                    </span>
                    <div className="h-px flex-1 bg-primary/20" />
                  </div>
                )}
                <DayCard
                  date={day}
                  isToday={isSameDay(day, today)}
                  isPast={day < today && !isSameDay(day, today)}
                  tasks={tasksForDay(day)}
                  onToggleTask={toggleComplete}
                  onEditTask={setEditingTask}
                  onTap={() => navigate(`/tasks/add?date=${dateStr}`)}
                />
              </div>
            )
          })}
          <div className="h-4" />
        </div>
      </div>

      {/* Task edit bottom sheet */}
      {editingTask && (
        <TaskEditSheet
          recurringTaskId={editingTask.recurring_task_id}
          onClose={() => setEditingTask(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
