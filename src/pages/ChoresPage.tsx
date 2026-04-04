import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Member } from '@/contexts/HouseholdContext'

// ── Types ───────────────────────────────────────────────────────

interface Chore {
  id: string
  household_id: string
  child_member_id: string
  name: string
  repeat: 'daily' | 'weekly'
  days_of_week: string[]
}

interface ChoreCompletion {
  id: string
  chore_id: string
  completed_date: string
}

// ── Helpers ─────────────────────────────────────────────────────

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

const ALL_DAYS = [
  { key: 'monday',    short: 'M', label: 'Mon' },
  { key: 'tuesday',   short: 'T', label: 'Tue' },
  { key: 'wednesday', short: 'W', label: 'Wed' },
  { key: 'thursday',  short: 'T', label: 'Thu' },
  { key: 'friday',    short: 'F', label: 'Fri' },
  { key: 'saturday',  short: 'S', label: 'Sat' },
  { key: 'sunday',    short: 'S', label: 'Sun' },
]

const CHILD_EMOJIS = ['⭐', '🌟', '🎯', '🎨', '🦋', '🌈', '🎪', '🚀']

function getMelbourneToday(): string {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function isChoreToday(chore: Chore, todayStr: string): boolean {
  if (chore.repeat === 'daily') return true
  const d = new Date(todayStr + 'T00:00:00Z')
  return (chore.days_of_week ?? []).includes(DAY_NAMES[d.getUTCDay()])
}

// ── Main page ───────────────────────────────────────────────────

export default function ChoresPage() {
  const { household, members } = useHousehold()
  const kids = members.filter(m => m.role === 'child')
  const today = getMelbourneToday()

  const [chores,        setChores]        = useState<Chore[]>([])
  const [completions,   setCompletions]   = useState<ChoreCompletion[]>([])
  const [selectedChild, setSelectedChild] = useState<Member | null>(null)
  const [addingChore,   setAddingChore]   = useState(false)
  const [loading,       setLoading]       = useState(true)

  const loadData = useCallback(async () => {
    if (!household) return
    const [{ data: choresData }, { data: completionsData }] = await Promise.all([
      supabase.from('chores').select('*').eq('household_id', household.id),
      supabase.from('chore_completions').select('*').eq('completed_date', today),
    ])
    setChores((choresData as Chore[]) ?? [])
    setCompletions((completionsData as ChoreCompletion[]) ?? [])
    setLoading(false)
  }, [household?.id, today])

  useEffect(() => { void loadData() }, [loadData])

  async function toggleChore(chore: Chore) {
    const isCompleted = completions.some(c => c.chore_id === chore.id)
    if (isCompleted) {
      await supabase.from('chore_completions')
        .delete()
        .eq('chore_id', chore.id)
        .eq('completed_date', today)
      setCompletions(prev => prev.filter(c => c.chore_id !== chore.id))
    } else {
      const { data } = await supabase.from('chore_completions')
        .insert({ chore_id: chore.id, completed_date: today })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data as ChoreCompletion])
    }
  }

  async function deleteChore(choreId: string) {
    await supabase.from('chores').delete().eq('id', choreId)
    setChores(prev => prev.filter(c => c.id !== choreId))
    setCompletions(prev => prev.filter(c => c.chore_id !== choreId))
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
            <p className="text-sm font-bold text-foreground">Chores</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ── No kids ──────────────────────────────────────────────────
  if (kids.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
            <p className="text-sm font-bold text-foreground">Chores</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6 text-center">
          <span className="text-5xl">⭐</span>
          <p className="font-semibold text-foreground">No kids added yet</p>
          <p className="text-sm">Add your kids in Settings to get started with chores.</p>
        </div>
      </div>
    )
  }

  // ── Child chore list ─────────────────────────────────────────
  if (selectedChild) {
    const childChores = chores
      .filter(c => c.child_member_id === selectedChild.id)
      .filter(c => isChoreToday(c, today))

    const allChoresForChild = chores.filter(c => c.child_member_id === selectedChild.id)
    const kidIdx = kids.findIndex(k => k.id === selectedChild.id)
    const emoji = CHILD_EMOJIS[kidIdx % CHILD_EMOJIS.length]

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-2 h-14 max-w-lg mx-auto">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedChild(null)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <span className="text-lg">{emoji}</span>
              <p className="text-sm font-bold text-foreground ml-1">{selectedChild.name}'s Chores</p>
            </div>
            <button
              onClick={() => setAddingChore(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 max-w-lg mx-auto w-full">
          {childChores.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <span className="text-4xl">✨</span>
              <p className="text-sm">No chores today</p>
              <button
                onClick={() => setAddingChore(true)}
                className="text-sm text-primary font-medium hover:underline"
              >
                + Add a chore
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {childChores.map(chore => {
                const done = completions.some(c => c.chore_id === chore.id)
                return (
                  <div
                    key={chore.id}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 border transition-all',
                      done ? 'bg-muted/30 border-border/50' : 'bg-card border-border shadow-sm',
                    )}
                  >
                    <button
                      onClick={() => void toggleChore(chore)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        done ? 'bg-primary border-primary' : 'border-border hover:border-primary/60',
                      )}
                    >
                      {done && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span className={cn(
                      'flex-1 text-sm font-medium',
                      done ? 'line-through text-muted-foreground' : 'text-foreground',
                    )}>
                      {chore.name}
                    </span>
                    <button
                      onClick={() => void deleteChore(chore.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}

              {/* Non-today chores for context */}
              {allChoresForChild.filter(c => !isChoreToday(c, today)).length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 pt-4 pb-1">
                    Other days
                  </p>
                  {allChoresForChild.filter(c => !isChoreToday(c, today)).map(chore => (
                    <div
                      key={chore.id}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 border border-border/50 bg-muted/20"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-border/40 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-muted-foreground">{chore.name}</span>
                      <button
                        onClick={() => void deleteChore(chore.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
              <div className="h-4" />
            </div>
          )}
        </div>

        {addingChore && (
          <AddChoreSheet
            child={selectedChild}
            householdId={household!.id}
            onSaved={newChore => {
              setChores(prev => [...prev, newChore])
              setAddingChore(false)
            }}
            onClose={() => setAddingChore(false)}
          />
        )}
      </div>
    )
  }

  // ── Card grid ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <p className="text-sm font-bold text-foreground">Chores</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {kids.map((kid, i) => {
            const kidChores = chores
              .filter(c => c.child_member_id === kid.id)
              .filter(c => isChoreToday(c, today))
            const doneCount = kidChores.filter(c => completions.some(cc => cc.chore_id === c.id)).length
            const total     = kidChores.length
            const allDone   = total > 0 && doneCount === total
            const emoji     = CHILD_EMOJIS[i % CHILD_EMOJIS.length]

            return (
              <button
                key={kid.id}
                onClick={() => setSelectedChild(kid)}
                className="rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
                style={{
                  background: '#f5f0e8',
                  border: `3px solid ${allDone ? '#2d7a1f' : '#3a5c2e'}`,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{allDone ? '🌟' : emoji}</span>
                  {allDone && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                      style={{ background: '#2d7a1f' }}
                    >
                      Done!
                    </span>
                  )}
                </div>
                <p className="font-bold text-black text-base leading-tight">{kid.name}</p>
                <p className="text-xs text-black/50 mt-0.5">
                  {total === 0 ? 'No chores today' : `${doneCount}/${total} done`}
                </p>
                {total > 0 && (
                  <div className="mt-3 h-1.5 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(doneCount / total) * 100}%`,
                        background: allDone ? '#2d7a1f' : '#3a5c2e',
                      }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Add Chore Sheet ─────────────────────────────────────────────

function AddChoreSheet({
  child,
  householdId,
  onSaved,
  onClose,
}: {
  child: Member
  householdId: string
  onSaved: (chore: Chore) => void
  onClose: () => void
}) {
  const [name,         setName]         = useState('')
  const [repeat,       setRepeat]       = useState<'daily' | 'weekly'>('daily')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  function toggleDay(day: string) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Please enter a chore name.'); return }
    if (repeat === 'weekly' && selectedDays.length === 0) { setError('Pick at least one day.'); return }
    setSaving(true)
    const { data, error: dbErr } = await supabase
      .from('chores')
      .insert({
        household_id:    householdId,
        child_member_id: child.id,
        name:            name.trim(),
        repeat,
        days_of_week:    repeat === 'weekly' ? selectedDays : [],
      })
      .select()
      .single()
    setSaving(false)
    if (dbErr || !data) { setError(dbErr?.message ?? 'Failed to save.'); return }
    onSaved(data as Chore)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Add chore for {child.name}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Chore name</Label>
            <Input
              placeholder="e.g. Make bed"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSave() }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Repeat</Label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map(opt => (
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
                  {opt === 'daily' ? 'Every day' : 'Weekly'}
                </button>
              ))}
            </div>
          </div>
          {repeat === 'weekly' && (
            <div className="space-y-2">
              <Label>Repeats on</Label>
              <div className="flex gap-1.5">
                {ALL_DAYS.map(d => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={cn(
                      'flex-1 flex flex-col items-center py-2 rounded-xl border text-xs font-semibold transition-colors',
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
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="shrink-0 px-4 py-3 border-t border-border">
          <Button
            className="w-full"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Add chore'}
          </Button>
        </div>
      </div>
    </>
  )
}
