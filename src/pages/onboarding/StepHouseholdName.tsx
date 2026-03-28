import { useWizard } from '@/contexts/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { onNext: () => void }

export default function StepHouseholdName({ onNext }: Props) {
  const { data, setField } = useWizard()

  function handleNext() {
    if (data.householdName.trim()) onNext()
  }

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">What's your household called?</h1>
        <p className="text-muted-foreground">This is how your family will be identified in Clann.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="householdName">Household name</Label>
        <Input
          id="householdName"
          placeholder="e.g. The Richmonds"
          value={data.householdName}
          onChange={e => setField('householdName', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          autoFocus
        />
      </div>

      <div className="mt-auto pt-8">
        <Button
          className="w-full"
          onClick={handleNext}
          disabled={!data.householdName.trim()}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
