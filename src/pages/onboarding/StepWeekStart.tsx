import { useWizard } from '@/contexts/WizardContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props { onNext: () => void; onBack: () => void }

const OPTIONS = [
  {
    value: 'monday' as const,
    label: 'Monday',
    days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
  {
    value: 'sunday' as const,
    label: 'Sunday',
    days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
]

export default function StepWeekStart({ onNext, onBack }: Props) {
  const { data, setField } = useWizard()

  return (
    <div className="flex flex-col flex-1 pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">When does your week start?</h1>
        <p className="text-muted-foreground">This affects how the weekly view is displayed.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setField('weekStartDay', opt.value)}
            className={cn(
              'w-full rounded-xl border p-4 text-left transition-all',
              data.weekStartDay === opt.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-foreground">{opt.label}</span>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                data.weekStartDay === opt.value
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              )}>
                {data.weekStartDay === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
            {/* Mini calendar row */}
            <div className="flex gap-1">
              {opt.days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 text-center text-xs py-1 rounded font-medium',
                    i === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue</Button>
      </div>
    </div>
  )
}
