import { useState } from 'react'
import { useWizard } from '@/contexts/WizardContext'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Users, Calendar, Home } from 'lucide-react'

interface Props { onBack: () => void }

const AGE_LABELS: Record<string, string> = {
  under5: 'Under 5',
  '5to12': '5–12',
  teen: '13–17',
}

const PORTION: Record<string, number> = {
  under5: 0.5,
  '5to12': 0.75,
  teen: 1.0,
}

function generateJoinCode(): string {
  // Unambiguous chars — no 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => chars[b % chars.length])
    .join('')
}

export default function StepSummary({ onBack }: Props) {
  const { data } = useWizard()
  const { user } = useAuth()
  const { refresh } = useHousehold()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPartner = data.partnerName.trim().length > 0

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)

    try {
      // 1. Create household with join code
      const joinCode = generateJoinCode()
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .insert({
          name: data.householdName.trim(),
          week_start_day: data.weekStartDay,
          join_code: joinCode,
        })
        .select('id')
        .single()

      if (hhErr || !hh) {
        setError(hhErr?.message ?? 'Failed to create household')
        return
      }

      // 2. Insert primary adult + optional partner in one batch
      const adults = [
        {
          household_id: hh.id,
          name: data.adultName.trim(),
          role: 'adult',
          age_bracket: 'adult',
          portion_multiplier: 1.0,
          is_primary: true,
          auth_user_id: user.id,
        },
        ...(hasPartner ? [{
          household_id: hh.id,
          name: data.partnerName.trim(),
          role: 'adult',
          age_bracket: 'adult',
          portion_multiplier: 1.0,
          is_primary: false,
          auth_user_id: null,   // linked when partner joins with the code
        }] : []),
      ]

      const { error: adultsErr } = await supabase.from('members').insert(adults)
      if (adultsErr) { setError(adultsErr.message); return }

      // 3. Insert kids
      if (data.kids.length > 0) {
        const { error: kidsErr } = await supabase.from('members').insert(
          data.kids.map(kid => ({
            household_id: hh.id,
            name: kid.name,
            role: 'child',
            age_bracket: kid.age_bracket,
            portion_multiplier: PORTION[kid.age_bracket] ?? 0.75,
            is_primary: false,
            auth_user_id: null,
          }))
        )
        if (kidsErr) { setError(kidsErr.message); return }
      }

      // 4. Refresh context → App gates to main view
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Looks good?</h1>
        <p className="text-muted-foreground">Review your household details before we get started.</p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {/* Household name */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Home size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Household</p>
            <p className="font-semibold text-foreground">{data.householdName}</p>
          </div>
        </div>

        {/* Members */}
        <div className="flex items-start gap-3 p-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Users size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Members</p>
            <p className="font-semibold text-foreground">
              {data.adultName}{' '}
              <span className="text-xs font-normal text-muted-foreground">(you)</span>
            </p>
            {hasPartner && (
              <p className="text-sm text-foreground mt-1">
                {data.partnerName}{' '}
                <span className="text-xs text-muted-foreground">— joins with code</span>
              </p>
            )}
            {data.kids.map(kid => (
              <p key={kid.id} className="text-sm text-foreground mt-1">
                {kid.name}{' '}
                <span className="text-xs text-muted-foreground">— {AGE_LABELS[kid.age_bracket]}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Week start */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Week starts</p>
            <p className="font-semibold text-foreground capitalize">{data.weekStartDay}</p>
          </div>
        </div>
      </div>

      {hasPartner && (
        <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          A join code will be generated for {data.partnerName}. Share it from Settings so they can link their account.
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="mt-auto pt-8 flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={saving} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            "Let's go!"
          )}
        </Button>
      </div>
    </div>
  )
}
