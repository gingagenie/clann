import { NavLink } from 'react-router-dom'
import { Home, ListTodo, UtensilsCrossed, ShoppingCart, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/',         icon: Home,            label: 'Home' },
  { to: '/tasks',    icon: ListTodo,        label: 'Tasks' },
  { to: '/meals',    icon: UtensilsCrossed, label: 'Meals' },
  { to: '/shopping', icon: ShoppingCart,    label: 'Shopping' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-pb shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)]">
      <div className="max-w-lg mx-auto flex items-stretch h-16">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex items-center justify-center"
          >
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
                <div className={cn(
                  'flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/12',
                )}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </div>
                <span className={cn(
                  'text-[10px] leading-none transition-all duration-200',
                  isActive ? 'font-bold' : 'font-medium',
                )}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
