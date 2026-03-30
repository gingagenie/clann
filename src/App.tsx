import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import AuthPage from '@/pages/AuthPage'
import HouseholdChoicePage from '@/pages/onboarding/HouseholdChoicePage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import JoinPage from '@/pages/onboarding/JoinPage'
import AppShell from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import TasksPage from '@/pages/TasksPage'
import MealsPage from '@/pages/MealsPage'
import RecipesPage from '@/pages/RecipesPage'
import ShoppingPage from '@/pages/ShoppingPage'
import SettingsPage from '@/pages/SettingsPage'
import TaskFormPage from '@/pages/tasks/TaskFormPage'

type HouseholdPath = 'choose' | 'new' | 'join'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { session, loading: authLoading } = useAuth()
  const { household, initialized } = useHousehold()
  const [path, setPath] = useState<HouseholdPath>('choose')

  if (authLoading || !initialized) return <LoadingScreen />
  if (!session) return <AuthPage />

  if (!household) {
    if (path === 'choose') return <HouseholdChoicePage onNew={() => setPath('new')} onJoin={() => setPath('join')} />
    if (path === 'new')    return <OnboardingPage />
    if (path === 'join')   return <JoinPage onBack={() => setPath('choose')} />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Full-screen pages outside the tab shell */}
      <Route path="/tasks/add"       element={<TaskFormPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
