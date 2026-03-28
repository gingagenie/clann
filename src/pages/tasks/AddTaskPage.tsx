import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

const ALL_DAYS = [
  { key: 'monday',    short: 'M', label: 'Mon' },
  { key: 'tuesday',   short: 'T', label: 'Tue' },
  { key: 'wednesday', short: 'W', label: 'Wed' },
  { key: 'thursday',  short: 'T', label: 'Thu' },
  { key: 'friday',    short: 'F', label: 'Fri' },
  { key: 'saturday',  short: 'S', label: 'Sat' },
  { key: 'sunday',    short: 'S', label: 'Sun' },
]

const ADVANCE_OPTIONS = [
  { key: 'same_day'    as const, label: 'Same day'     },
  { key: 'night_before' as const, label: 'Night before' },
]

export default function AddTaskPage() {
  const navigate = useNavigate()
  const { household, members } = useHousehold()

  const [name, setName]                 = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [assignedTo, setAssignedTo]     = useState<string | null>(null)
  const [reminder, setReminder]         = useState(false)
  const [remHour, setRemHour]           = useState('08')
  const [remMinute, setRemMinute]       = useState('00')
  const [advance, setAdvance]           = useState<'same_day' | 'night_before'>('same_day')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const adults = members.filter(m => m.role === 'adult')

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function handleSave() {
    if (!name.trim())          { setError('Please enter a task name.'); return }
    if (!selectedDays.length)  { setError('Please select at least one day.'); return }
    if (!household)            return

    setSaving(true)
    setError(null)

    const reminderTime = reminder
      ? `${remHour.padStart(2, '0')}:${remMinute.padStart(2, '0')}:00`
      : null

    const { error: err } = await supabase.from('recurring_tasks').insert({
      household_id:     household.id,
      name:             name.trim(),
      days_of_week:     selectedDays,
      assigned_to:      assignedTo,
      reminder_enabled: reminder,
      reminder_time:    reminderTime,
      reminder_advance: reminder ? advance : null,
    })

    setSaving(false)

    if (err) { setError(err.message); return }
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex items-center gap-3 px-4 h-14">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-semibold text-foreground">New recurring task</h1>
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
            autoFocus
          />
        </div>

        {/* Days */}
        <div className="space-y-2">
          <Label>Repeats on</Label>
          <div className="flex gap-2">
            {ALL_DAYS.map(d => (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={cn(
                  'flex-1 flex flex-col items-center py-2.5 rounded-lg border text-xs font-semibold transition-colors',
                  selectedDays.includes(d.key)
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <span className="text-sm">{d.short}</span>
                <span className="mt-0.5 opacity-70">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

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
                  : 'border-border text-muted-foreground hover:border-primary/40'
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
                    : 'border-border text-muted-foreground hover:border-primary/40'
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
            <Label htmlFor="reminder-toggle">Reminder</Label>
            <Switch
              id="reminder-toggle"
              checked={reminder}
              onCheckedChange={setReminder}
            />
          </div>

          {reminder && (
            <div className="space-y-4 pl-1">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Time</Label>
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
                <Label className="text-muted-foreground">Remind me</Label>
                <div className="flex gap-2">
                  {ADVANCE_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setAdvance(opt.key)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                        advance === opt.key
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {opt.label}
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
      </div>

      {/* Footer save button */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : 'Save task'}
        </Button>
      </div>
    </div>
  )
}
