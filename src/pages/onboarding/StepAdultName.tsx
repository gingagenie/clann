import { useWizard } from '@/contexts/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { onNext: () => void; onBack: () => void }

export default function StepAdultName({ onNext, onBack }: Props) {
  const { data, setField } = useWizard()

  function handleNext() {
    if (data.adultName.trim()) onNext()
  }

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">What's your name?</h1>
        <p className="text-muted-foreground">You'll be the primary adult in {data.householdName || 'your household'}.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adultName">Your name</Label>
        <Input
          id="adultName"
          placeholder="e.g. Sarah"
          value={data.adultName}
          onChange={e => setField('adultName', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          autoFocus
        />
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={handleNext} disabled={!data.adultName.trim()} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
