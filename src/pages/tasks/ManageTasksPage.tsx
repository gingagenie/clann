import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, ChevronRight, ClipboardList } from 'lucide-react'

interface RecurringTask {
  id: string
  name: string
  repeat: 'weekly' | 'monthly' | 'one_off'
  days_of_week: string[]
  day_of_month: number | null
  one_off_date: string | null
  assigned_to: string | null
}

const DAY_SHORT_MAP: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function repeatLabel(task: RecurringTask): string {
  if (task.repeat === 'one_off') {
    if (!task.one_off_date) return 'One-off'
    const d = new Date(task.one_off_date + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (task.repeat === 'monthly') {
    return task.day_of_month ? `Monthly · ${ordinal(task.day_of_month)}` : 'Monthly'
  }
  // weekly
  if (!task.days_of_week?.length) return 'Weekly'
  return task.days_of_week.map(d => DAY_SHORT_MAP[d] ?? d).join(' · ')
}

export default function ManageTasksPage() {
  const navigate = useNavigate()
  const { household, members } = useHousehold()
  const [tasks,   setTasks]   = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household) return
    supabase
      .from('recurring_tasks')
      .select('*')
      .eq('household_id', household.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setTasks((data ?? []) as RecurringTask[])
        setLoading(false)
      })
  }, [household?.id])

  function memberName(id: string | null): string | null {
    if (!id) return null
    return members.find(m => m.id === id)?.name ?? null
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex items-center gap-3 px-2 h-14">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="font-semibold text-foreground flex-1">Manage tasks</h1>
        <button
          onClick={() => navigate('/tasks/add')}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <ClipboardList size={40} strokeWidth={1.25} />
            <p className="text-sm">No tasks yet</p>
            <Button size="sm" onClick={() => navigate('/tasks/add')} className="rounded-xl mt-1">
              Add your first task
            </Button>
          </div>
        ) : (
          tasks.map(task => (
            <button
              key={task.id}
              onClick={() => navigate(`/tasks/edit/${task.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 hover:shadow-md active:scale-[0.99] transition-all text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{task.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {repeatLabel(task)}
                  {memberName(task.assigned_to) && (
                    <span className="ml-2 text-muted-foreground/60">· {memberName(task.assigned_to)}</span>
                  )}
                </p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground/40 shrink-0" />
            </button>
          ))
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}
