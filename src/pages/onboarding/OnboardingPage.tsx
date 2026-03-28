import { useState } from 'react'
import { WizardProvider } from '@/contexts/WizardContext'
import StepHouseholdName from './StepHouseholdName'
import StepAdultName from './StepAdultName'
import StepPartner from './StepPartner'
import StepKids from './StepKids'
import StepWeekStart from './StepWeekStart'
import StepSummary from './StepSummary'

const TOTAL_STEPS = 6

export default function OnboardingPage() {
  const [step, setStep] = useState(1)

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  return (
    <WizardProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div
            className="h-1 bg-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col max-w-lg w-full mx-auto px-4 pb-8">
          {step === 1 && <StepHouseholdName onNext={next} />}
          {step === 2 && <StepAdultName     onNext={next} onBack={back} />}
          {step === 3 && <StepPartner       onNext={next} onBack={back} />}
          {step === 4 && <StepKids          onNext={next} onBack={back} />}
          {step === 5 && <StepWeekStart     onNext={next} onBack={back} />}
          {step === 6 && <StepSummary       onBack={back} />}
        </div>
      </div>
    </WizardProvider>
  )
}
