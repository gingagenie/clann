import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft } from 'lucide-react'

interface Props { onBack: () => void }

export default function JoinPage({ onBack }: Props) {
  const { refresh } = useHousehold()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcErr } = await supabase
        .rpc('join_household_by_code', { code: trimmed })

      if (rpcErr) {
        setError(rpcErr.message)
        return
      }

      const result = data as { error?: string; success?: boolean }
      if (result?.error) {
        setError(result.error)
        return
      }

      // Refresh household context → App drops into main view
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col max-w-sm w-full mx-auto px-6 pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Join a household</h1>
          <p className="text-muted-foreground">
            Enter the 6-character join code from your partner's Settings screen.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="joinCode">Join code</Label>
          <Input
            id="joinCode"
            placeholder="e.g. ABC123"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={6}
            className="text-center text-2xl font-bold tracking-[0.3em] uppercase"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-8">
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={code.trim().length < 6 || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Joining…
              </span>
            ) : 'Join household'}
          </Button>
        </div>
      </div>
    </div>
  )
}
