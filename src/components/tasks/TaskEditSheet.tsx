import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Trash2, X } from 'lucide-react'

const ALL_DAYS = [
  { key: 'monday',    short: 'M', label: 'Mon' },
  { key: 'tuesday',   short: 'T', label: 'Tue' },
  { key: 'wednesday', short: 'W', label: 'Wed' },
  { key: 'thursday',  short: 'T', label: 'Thu' },
  { key: 'friday',    short: 'F', label: 'Fri' },
  { key: 'saturday',  short: 'S', label: 'Sat' },
  { key: 'sunday',    short: 'S', label: 'Sun' },
]

type RepeatType  = 'weekly' | 'monthly' | 'one_off'
type AdvanceType = 'same_day' | 'night_before'

function DayOfMonthPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
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

interface Props {
  recurringTaskId: string
  onClose: () => void
  onSaved: () => void
}

export default function TaskEditSheet({ recurringTaskId, onClose, onSaved }: Props) {
  const { household, members } = useHousehold()
  const adults = members.filter(m => m.role === 'adult')

  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [name,         setName]         = useState('')
  const [repeat,       setRepeat]       = useState<RepeatType>('weekly')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [dayOfMonth,   setDayOfMonth]   = useState<number | null>(null)
  const [oneOffDate,   setOneOffDate]   = useState('')
  const [assignedTo,   setAssignedTo]   = useState<string | null>(null)
  const [reminder,     setReminder]     = useState(false)
  const [remHour,      setRemHour]      = useState('08')
  const [remMinute,    setRemMinute]    = useState('00')
  const [advance,      setAdvance]      = useState<AdvanceType>('same_day')

  useEffect(() => {
    supabase
      .from('recurring_tasks')
      .select('*')
      .eq('id', recurringTaskId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { onClose(); return }
        setName(data.name ?? '')
        setRepeat((data.repeat as RepeatType) ?? 'weekly')
        setSelectedDays(data.days_of_week ?? [])
        setDayOfMonth(data.day_of_month ?? null)
        setOneOffDate(data.one_off_date ?? '')
        setAssignedTo(data.assigned_to ?? null)
        setReminder(data.reminder_enabled ?? false)
        if (data.reminder_time) {
          const [h, m] = (data.reminder_time as string).split(':')
          setRemHour(h ?? '08')
          setRemMinute(m ?? '00')
        }
        setAdvance((data.reminder_advance as AdvanceType) ?? 'same_day')
        setLoading(false)
      })
  }, [recurringTaskId, onClose])

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
    setSaving(true); setError(null)
    const reminderTime = reminder
      ? `${remHour.padStart(2, '0')}:${remMinute.padStart(2, '0')}:00`
      : null
    const payload = {
      name:             name.trim(),
      repeat,
      days_of_week:     repeat === 'weekly'  ? selectedDays : [],
      day_of_month:     repeat === 'monthly' ? dayOfMonth   : null,
      one_off_date:     repeat === 'one_off' ? oneOffDate   : null,
      assigned_to:      assignedTo,
      reminder_enabled: reminder,
      reminder_time:    reminderTime,
      reminder_advance: reminder ? advance : null,
    }
    const { error: dbErr } = await supabase
      .from('recurring_tasks')
      .update(payload)
      .eq('id', recurringTaskId)
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('week_tasks').delete().eq('recurring_task_id', recurringTaskId)
    await supabase.from('recurring_tasks').delete().eq('id', recurringTaskId)
    setDeleting(false)
    onSaved()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[88vh] flex flex-col shadow-xl">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Edit task</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* Name */}
              <div className="space-y-1.5">
                <Label>Task name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Repeat type */}
              <div className="space-y-2">
                <Label>Repeat</Label>
                <div className="flex gap-2">
                  {(['weekly', 'monthly', 'one_off'] as RepeatType[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRepeat(opt)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors',
                        repeat === opt
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {opt === 'weekly' ? 'Weekly' : opt === 'monthly' ? 'Monthly' : 'One-off'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly: day of week */}
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

              {/* Monthly: day of month */}
              {repeat === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of month</Label>
                  <DayOfMonthPicker value={dayOfMonth} onChange={setDayOfMonth} />
                </div>
              )}

              {/* One-off: date */}
              {repeat === 'one_off' && (
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
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

              {/* Reminder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Reminder</Label>
                  <Switch checked={reminder} onCheckedChange={setReminder} />
                </div>
                {reminder && (
                  <div className="space-y-4 pl-1">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Time</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-16 text-center font-bold text-lg"
                          value={remHour}
                          onChange={e => setRemHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          maxLength={2}
                          placeholder="08"
                        />
                        <span className="text-xl font-bold text-muted-foreground">:</span>
                        <Input
                          className="w-16 text-center font-bold text-lg"
                          value={remMinute}
                          onChange={e => setRemMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          maxLength={2}
                          placeholder="00"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Remind me</Label>
                      <div className="flex gap-2">
                        {(['same_day', 'night_before'] as AdvanceType[]).map(opt => (
                          <button
                            key={opt}
                            onClick={() => setAdvance(opt)}
                            className={cn(
                              'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                              advance === opt
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/40',
                            )}
                          >
                            {opt === 'same_day' ? 'Same day' : 'Night before'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="h-2" />
            </div>

            {/* Save */}
            <div className="shrink-0 px-4 py-3 border-t border-border">
              <Button className="w-full" onClick={() => void handleSave()} disabled={saving || deleting}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Save changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
