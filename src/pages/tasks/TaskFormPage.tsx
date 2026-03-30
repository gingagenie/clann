import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ArrowLeft, Trash2 } from 'lucide-react'

const ALL_DAYS = [
  { key: 'monday',    short: 'M', label: 'Mon' },
  { key: 'tuesday',   short: 'T', label: 'Tue' },
  { key: 'wednesday', short: 'W', label: 'Wed' },
  { key: 'thursday',  short: 'T', label: 'Thu' },
  { key: 'friday',    short: 'F', label: 'Fri' },
  { key: 'saturday',  short: 'S', label: 'Sat' },
  { key: 'sunday',    short: 'S', label: 'Sun' },
]

type RepeatType = 'weekly' | 'monthly' | 'one_off'

const REPEAT_OPTIONS: { key: RepeatType; label: string }[] = [
  { key: 'weekly',  label: 'Weekly'  },
  { key: 'monthly', label: 'Monthly' },
  { key: 'one_off', label: 'One-off' },
]

// Day-of-month picker — shows 1-28 in a grid
function DayOfMonthPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={cn(
            'h-9 rounded-lg border text-sm font-semibold transition-colors',
            value === d
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-primary/40',
          )}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

export default function TaskFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id?: string }>()
  const isEdit   = !!id

  const { household, members } = useHousehold()
  const adults = members.filter(m => m.role === 'adult')

  const [loading,      setLoading]      = useState(isEdit)
  const [name,         setName]         = useState('')
  const [repeat,       setRepeat]       = useState<RepeatType>('weekly')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [dayOfMonth,   setDayOfMonth]   = useState<number | null>(null)
  const [oneOffDate,   setOneOffDate]   = useState('')
  const [assignedTo,   setAssignedTo]   = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Load existing task when editing
  useEffect(() => {
    if (!id) return
    supabase
      .from('recurring_tasks')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/tasks/manage'); return }
        setName(data.name ?? '')
        setRepeat((data.repeat as RepeatType) ?? 'weekly')
        setSelectedDays(data.days_of_week ?? [])
        setDayOfMonth(data.day_of_month ?? null)
        setOneOffDate(data.one_off_date ?? '')
        setAssignedTo(data.assigned_to ?? null)
        setLoading(false)
      })
  }, [id, navigate])

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function validate(): string | null {
    if (!name.trim()) return 'Please enter a task name.'
    if (repeat === 'weekly' && selectedDays.length === 0) return 'Please select at least one day.'
    if (repeat === 'monthly' && !dayOfMonth) return 'Please select a day of the month.'
    if (repeat === 'one_off' && !oneOffDate) return 'Please pick a date.'
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    if (!household) return

    setSaving(true)
    setError(null)

    const payload = {
      household_id:  household.id,
      name:          name.trim(),
      repeat,
      days_of_week:  repeat === 'weekly'  ? selectedDays : [],
      day_of_month:  repeat === 'monthly' ? dayOfMonth   : null,
      one_off_date:  repeat === 'one_off' ? oneOffDate   : null,
      assigned_to:   assignedTo,
      // clear reminder fields (not changing them on edit)
    }

    const { error: dbErr } = isEdit
      ? await supabase.from('recurring_tasks').update(payload).eq('id', id!)
      : await supabase.from('recurring_tasks').insert(payload)

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    navigate('/tasks/manage')
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    // Delete the recurring task; week_tasks will cascade if FK set, otherwise clean up
    await supabase.from('week_tasks').delete().eq('recurring_task_id', id)
    await supabase.from('recurring_tasks').delete().eq('id', id)
    setDeleting(false)
    navigate('/tasks/manage')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
        <h1 className="font-semibold text-foreground flex-1">
          {isEdit ? 'Edit task' : 'New task'}
        </h1>
        {isEdit && (
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 max-w-lg mx-auto w-full">

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="taskName">Task name</Label>
          <Input
            id="taskName"
            placeholder="e.g. Put bins out"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus={!isEdit}
          />
        </div>

        {/* Repeat type */}
        <div className="space-y-2">
          <Label>Repeat</Label>
          <div className="flex gap-2">
            {REPEAT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setRepeat(opt.key)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                  repeat === opt.key
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly: day of week picker */}
        {repeat === 'weekly' && (
          <div className="space-y-2">
            <Label>Repeats on</Label>
            <div className="flex gap-1.5">
              {ALL_DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-2.5 rounded-xl border text-xs font-semibold transition-colors',
                    selectedDays.includes(d.key)
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <span className="text-sm">{d.short}</span>
                  <span className="mt-0.5 opacity-70">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly: day of month picker */}
        {repeat === 'monthly' && (
          <div className="space-y-2">
            <Label>Day of month</Label>
            <DayOfMonthPicker value={dayOfMonth} onChange={setDayOfMonth} />
            {dayOfMonth && (
              <p className="text-xs text-muted-foreground px-1">
                Repeats on the {dayOfMonth}{['st','nd','rd'][((dayOfMonth % 100 - 11) % 10 - 1)] ?? 'th'} of each month
              </p>
            )}
          </div>
        )}

        {/* One-off: date picker */}
        {repeat === 'one_off' && (
          <div className="space-y-1.5">
            <Label htmlFor="oneOffDate">Date</Label>
            <Input
              id="oneOffDate"
              type="date"
              value={oneOffDate}
              onChange={e => setOneOffDate(e.target.value)}
            />
          </div>
        )}

        {/* Assigned to */}
        <div className="space-y-2">
          <Label>Assigned to</Label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAssignedTo(null)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                assignedTo === null
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              Anyone
            </button>
            {adults.map(m => (
              <button
                key={m.id}
                onClick={() => setAssignedTo(m.id)}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                  assignedTo === m.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <Button className="w-full" onClick={() => void handleSave()} disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : isEdit ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </div>
  )
}
