import { Home, Users } from 'lucide-react'

interface Props {
  onNew: () => void
  onJoin: () => void
}

export default function HouseholdChoicePage({ onNew, onJoin }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Clann</h1>
          <p className="text-muted-foreground mt-1">Get started with your household</p>
        </div>

        <button
          onClick={onNew}
          className="w-full rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Home size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Set up a new household</p>
              <p className="text-sm text-muted-foreground mt-0.5">Create your family's space from scratch</p>
            </div>
          </div>
        </button>

        <button
          onClick={onJoin}
          className="w-full rounded-xl border border-border bg-card p-5 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Users size={22} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Join an existing household</p>
              <p className="text-sm text-muted-foreground mt-0.5">Enter a join code from your partner</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
