import { useWizard } from '@/contexts/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { onNext: () => void; onBack: () => void }

export default function StepPartner({ onNext, onBack }: Props) {
  const { data, setField } = useWizard()

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Do you have a partner?</h1>
        <p className="text-muted-foreground">
          Add their name and they'll appear in the household for task assignment.
          They can link their own account later using a join code.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerName">Partner's name <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="partnerName"
          placeholder="e.g. James"
          value={data.partnerName}
          onChange={e => setField('partnerName', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onNext()}
          autoFocus
        />
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {data.partnerName.trim() ? 'Continue' : 'Skip'}
        </Button>
      </div>
    </div>
  )
}
