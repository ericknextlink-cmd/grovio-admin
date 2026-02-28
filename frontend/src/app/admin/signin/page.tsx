'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, User, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import { setAdminToken, setAdminUser, getAdminToken } from '@/lib/cookies'

export default function AdminSignInPage() {
  const router = useRouter()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if already authenticated (only once on mount, with delay to prevent rapid redirects)
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const checkAuth = async () => {
      // Small delay to prevent rapid redirects
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!isMounted) return
      
      try {
        const token = getAdminToken() || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null)
        if (!token) return

        // Check if admin token is valid by calling admin profile endpoint
        const response = await fetch(`${API_BASE_URL}/api/admin/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (response.ok && isMounted) {
          const data = await response.json()
          if (data.success && data.data) {
            router.replace('/admin')
          }
        }
      } catch {
        // Not authenticated, stay on signin page
      }
    }
    
    timeoutId = setTimeout(() => {
      checkAuth()
    }, 100)
    
    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ usernameOrEmail, password })
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Store admin token in cookie (primary) and localStorage (fallback)
        if (data.data.token) {
          setAdminToken(data.data.token)
          // Also store in localStorage for backward compatibility
          localStorage.setItem('admin_token', data.data.token)
        }

        // Store admin info in cookie (primary) and localStorage (fallback)
        if (data.data.admin) {
          setAdminUser(data.data.admin)
          localStorage.setItem('admin_user', JSON.stringify(data.data.admin))
        }

        // Redirect to admin dashboard
        router.replace('/admin')
      } else {
        setError(data.message || data.errors?.[0] || 'Sign in failed. Please check your credentials.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-[#D35F0E] rounded-lg flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail">Username or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="username or admin@example.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#D35F0E] hover:bg-[#D35F0E]/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

