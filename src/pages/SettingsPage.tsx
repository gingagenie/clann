import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { cn } from '@/lib/utils'
import { Copy, Check, Bell, BellOff, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

// ── Section card ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  )
}

// ── Settings page ──────────────────────────────────────────────

export default function SettingsPage() {
  const { user, signOut }                       = useAuth()
  const { household, members, updateHousehold } = useHousehold()
  const { enabled, loading, supported, toggle } = usePushNotifications()

  const [copied, setCopied] = useState(false)

  // Household name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]     = useState('')
  const [savingName, setSavingName]   = useState(false)

  // Week start editing
  const [savingWeek, setSavingWeek] = useState(false)

  const joinCode = household?.join_code

  async function copyCode() {
    if (!joinCode) return
    await navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function startEditName() {
    setNameValue(household?.name ?? '')
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === household?.name) { setEditingName(false); return }
    setSavingName(true)
    await updateHousehold({ name: trimmed })
    setSavingName(false)
    setEditingName(false)
  }

  async function toggleWeekStart() {
    if (!household) return
    setSavingWeek(true)
    await updateHousehold({ week_start_day: household.week_start_day === 'monday' ? 'sunday' : 'monday' })
    setSavingWeek(false)
  }

  const adults = members.filter(m => m.role === 'adult')
  const kids   = members.filter(m => m.role === 'child')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <p className="text-sm font-bold text-foreground">Settings</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-w-lg mx-auto w-full">

        {/* Household */}
        <Section title="Household">
          {/* Name */}
          <div className="flex items-center justify-between px-4 py-3.5 gap-3">
            <span className="text-sm text-muted-foreground shrink-0">Name</span>
            {editingName ? (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <Input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="h-8 text-sm text-right w-40"
                  autoFocus
                />
                <Button size="sm" className="h-8 px-3 text-xs" onClick={saveName} disabled={savingName}>
                  {savingName ? '…' : 'Save'}
                </Button>
              </div>
            ) : (
              <button
                onClick={startEditName}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {household?.name}
                <Pencil size={12} className="text-muted-foreground/60" />
              </button>
            )}
          </div>

          {/* Week start */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">Week starts</span>
            <button
              onClick={toggleWeekStart}
              disabled={savingWeek}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <span className="capitalize">{household?.week_start_day}</span>
              <Pencil size={12} className="text-muted-foreground/60" />
            </button>
          </div>
        </Section>

        {/* Members */}
        <Section title="Members">
          {adults.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                m.auth_user_id
                  ? m.auth_user_id === user?.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground',
              )}>
                {m.auth_user_id ? (m.auth_user_id === user?.id ? 'You' : 'Linked') : 'Not joined'}
              </span>
            </div>
          ))}
          {kids.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Child
              </span>
            </div>
          ))}
        </Section>

        {/* Family join code */}
        {joinCode && (
          <Section title="Family join code">
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Share this code with anyone in your family — partner, grandparents, whoever — so they can join and see the same meals, shopping list and tasks.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold tracking-[0.3em] text-foreground">{joinCode}</span>
                </div>
                <Button variant="outline" size="icon" onClick={copyCode} className="rounded-xl shrink-0">
                  {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          </Section>
        )}

        {/* Notifications */}
        {supported && (
          <Section title="Notifications">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {enabled
                  ? <Bell size={18} className="text-primary shrink-0" />
                  : <BellOff size={18} className="text-muted-foreground shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-foreground">Dinner reminders</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {enabled ? 'Daily at 5pm — tap to turn off' : 'Get a nudge at 5pm each day'}
                  </p>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
            </div>
          </Section>
        )}

        {/* Account */}
        <Section title="Account">
          <div className="px-4 py-3.5 space-y-3">
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="outline" size="sm" onClick={signOut} className="rounded-xl">
              Sign out
            </Button>
          </div>
        </Section>

        <div className="h-4" />
      </div>
    </div>
  )
}
