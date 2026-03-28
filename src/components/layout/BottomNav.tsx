
import { NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, ChefHat, ShoppingCart, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/',         icon: Home,            label: 'Home' },
  { to: '/meals',    icon: UtensilsCrossed, label: 'Meals' },
  { to: '/recipes',  icon: ChefHat,         label: 'Recipes' },
  { to: '/shopping', icon: ShoppingCart,    label: 'Shopping' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
