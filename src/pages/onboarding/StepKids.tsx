import { useState } from 'react'
import { useWizard, type AgeBracket, type Kid } from '@/contexts/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { X, Plus } from 'lucide-react'

interface Props { onNext: () => void; onBack: () => void }

const AGE_BRACKETS: { value: AgeBracket; label: string; sub: string }[] = [
  { value: 'under5',  label: 'Under 5',  sub: 'Toddler' },
  { value: '5to12',   label: '5–12',     sub: 'Primary school' },
  { value: 'teen',    label: '13–17',    sub: 'Teen' },
]

export default function StepKids({ onNext, onBack }: Props) {
  const { data, setField } = useWizard()
  const [name, setName] = useState('')
  const [bracket, setBracket] = useState<AgeBracket>('5to12')
  const [adding, setAdding] = useState(false)

  function addKid() {
    if (!name.trim()) return
    const kid: Kid = {
      id: crypto.randomUUID(),
      name: name.trim(),
      age_bracket: bracket,
    }
    setField('kids', [...data.kids, kid])
    setName('')
    setBracket('5to12')
    setAdding(false)
  }

  function removeKid(id: string) {
    setField('kids', data.kids.filter(k => k.id !== id))
  }

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Any kids in the household?</h1>
        <p className="text-muted-foreground">Add them now, or skip — you can always add them later in Settings.</p>
      </div>

      {/* Kid list */}
      {data.kids.length > 0 && (
        <ul className="space-y-2 mb-4">
          {data.kids.map(kid => (
            <li
              key={kid.id}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-medium text-sm text-foreground">{kid.name}</p>
                <p className="text-xs text-muted-foreground">
                  {AGE_BRACKETS.find(b => b.value === kid.age_bracket)?.label}
                </p>
              </div>
              <button
                onClick={() => removeKid(kid.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add kid form */}
      {adding ? (
        <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
          <div className="space-y-1.5">
            <Label htmlFor="kidName">Name</Label>
            <Input
              id="kidName"
              placeholder="e.g. Aoife"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKid()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Age group</Label>
            <div className="grid grid-cols-3 gap-2">
              {AGE_BRACKETS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBracket(b.value)}
                  className={cn(
                    'flex flex-col items-center py-2.5 px-2 rounded-lg border text-sm transition-colors',
                    bracket === b.value
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <span className="font-medium">{b.label}</span>
                  <span className="text-xs mt-0.5 opacity-70">{b.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="flex-1">
              Cancel
            </Button>
            <Button size="sm" onClick={addKid} disabled={!name.trim()} className="flex-1">
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setAdding(true)}
          className="w-full border-dashed"
        >
          <Plus size={16} className="mr-2" />
          Add a child
        </Button>
      )}

      <div className="mt-auto pt-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {data.kids.length === 0 ? 'Skip' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
