
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
