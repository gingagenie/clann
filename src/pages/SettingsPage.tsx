import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold, type AustralianState } from '@/contexts/HouseholdContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { cn } from '@/lib/utils'
import { Copy, Check, Bell, BellOff, Pencil, Download, Share, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'

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
  const { household, members, updateHousehold, refresh } = useHousehold()
  const { enabled, loading, supported, permissionDenied, lastError, swStatus, toggle, scheduleTest } = usePushNotifications()
  const { canInstall, isIOSSafari, isInstalled, install } = usePWAInstall()

  const [copied, setCopied] = useState(false)

  // Household name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]     = useState('')
  const [savingName, setSavingName]   = useState(false)

  // Week start editing
  const [savingWeek, setSavingWeek] = useState(false)

  // State editing
  const [savingState, setSavingState] = useState(false)

  // Add member
  const [addingMember,    setAddingMember]    = useState(false)
  const [newMemberName,   setNewMemberName]   = useState('')
  const [newMemberRole,   setNewMemberRole]   = useState<'adult' | 'child'>('adult')
  const [savingMember,    setSavingMember]    = useState(false)
  const [deletingMember,  setDeletingMember]  = useState<string | null>(null)

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

  async function handleStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    setSavingState(true)
    await updateHousehold({ state: (value || null) as AustralianState | null })
    setSavingState(false)
  }

  async function toggleWeekStart() {
    if (!household) return
    setSavingWeek(true)
    await updateHousehold({ week_start_day: household.week_start_day === 'monday' ? 'sunday' : 'monday' })
    setSavingWeek(false)
  }

  async function handleAddMember() {
    const name = newMemberName.trim()
    if (!name || !household) return
    setSavingMember(true)
    await supabase.from('members').insert({
      household_id: household.id,
      name,
      role: newMemberRole,
      portion_multiplier: 1,
      is_primary: false,
    })
    setSavingMember(false)
    setAddingMember(false)
    setNewMemberName('')
    setNewMemberRole('adult')
    refresh()
  }

  async function handleDeleteMember(id: string) {
    setDeletingMember(id)
    await supabase.from('members').delete().eq('id', id)
    setDeletingMember(null)
    refresh()
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

          {/* School state */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">School state</span>
            <select
              value={household?.state ?? ''}
              onChange={handleStateChange}
              disabled={savingState}
              className="text-sm font-medium text-foreground bg-transparent border-0 outline-none cursor-pointer text-right disabled:opacity-50 pr-0"
            >
              <option value="">Not set</option>
              <option value="ACT">ACT</option>
              <option value="NSW">NSW</option>
              <option value="NT">NT</option>
              <option value="QLD">QLD</option>
              <option value="SA">SA</option>
              <option value="TAS">TAS</option>
              <option value="VIC">VIC</option>
              <option value="WA">WA</option>
            </select>
          </div>
        </Section>

        {/* Members */}
        <Section title="Adults">
          {adults.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                m.auth_user_id === user?.id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-accent text-accent-foreground',
              )}>
                {m.auth_user_id === user?.id ? 'You' : 'Joined'}
              </span>
            </div>
          ))}
        </Section>

        {/* Kids */}
        <Section title="Kids">
          {kids.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <button
                onClick={() => void handleDeleteMember(m.id)}
                disabled={deletingMember === m.id}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {addingMember ? (
            <div className="px-4 py-3 space-y-3">
              <Input
                placeholder="Child's name"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleAddMember(); if (e.key === 'Escape') setAddingMember(false) }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAddingMember(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => void handleAddMember()} disabled={savingMember || !newMemberName.trim()}>
                  {savingMember ? '…' : 'Add'}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingMember(true); setNewMemberRole('child') }}
              className="flex items-center gap-2 w-full px-4 py-3.5 text-sm text-primary font-medium hover:bg-muted/50 transition-colors"
            >
              <Plus size={16} />
              Add a kid
            </button>
          )}
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
            {permissionDenied && (
              <div className="px-4 pb-3.5">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Notifications are blocked. Go to <strong>Settings &gt; Apps &gt; Clann &gt; Notifications</strong> on your phone to allow them.
                </p>
              </div>
            )}
            {lastError && (
              <div className="px-4 pb-3.5">
                <p className="text-xs text-red-600 dark:text-red-400 break-all">
                  Error: {lastError}
                </p>
              </div>
            )}
            {enabled && !(window as any).__isNativeApp && (
              <div className="px-4 pb-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  SW: {swStatus === 'active' ? '✓ active' : swStatus === 'inactive' ? '✗ not active' : '…'}
                </p>
                <button
                  onClick={() => scheduleTest(1/12)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors block"
                >
                  SW notify (5 sec delay)
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Install app */}
        {!isInstalled && canInstall && (
          <Section title="Install app">
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add Clann to your home screen for the full app experience — works offline too.
              </p>
              <Button onClick={install} className="w-full rounded-xl gap-2">
                <Download size={16} />
                Install Clann
              </Button>
            </div>
          </Section>
        )}

        {/* iOS Safari manual install instructions */}
        {!isInstalled && isIOSSafari && (
          <Section title="Install app">
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add Clann to your home screen for the full app experience.
              </p>
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-2">
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Tap the <Share size={14} className="inline mb-0.5" /> <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Tap <strong>Add</strong> — done!</span>
                </div>
              </div>
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
