import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check } from 'lucide-react'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { household, members } = useHousehold()
  const [copied, setCopied] = useState(false)

  const joinCode = (household as (typeof household & { join_code?: string }) | null)?.join_code

  async function copyCode() {
    if (!joinCode) return
    await navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const adults = members.filter(m => m.role === 'adult')
  const kids   = members.filter(m => m.role === 'child')

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground pt-2">Settings</h1>

      {/* Household */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{household?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Week starts</span>
            <span className="font-medium capitalize">{household?.week_start_day}</span>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {adults.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground">
                {m.auth_user_id ? (m.auth_user_id === user?.id ? 'You' : 'Linked') : 'Not yet joined'}
              </span>
            </div>
          ))}
          {kids.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground">Child</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Join code */}
      {joinCode && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partner join code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Share this code with your partner so they can link their account.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-center">
                <span className="text-2xl font-bold tracking-[0.3em] text-foreground">{joinCode}</span>
              </div>
              <Button variant="outline" size="icon" onClick={copyCode} className="shrink-0">
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{user?.email}</p>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
