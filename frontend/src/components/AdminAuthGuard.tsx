'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import { getAdminToken, clearAdminCookies } from '@/lib/cookies'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const checkAuth = useCallback(async () => {
    try {
      // Use ONLY cookies - never localStorage
      const token = getAdminToken()
      
      if (!token) {
        router.push('/admin/signin')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        // Clear cookies only
        clearAdminCookies()
        router.push('/admin/signin')
        return
      }
      
      const data = await response.json()
      
      if (!data.success || !data.data) {
        clearAdminCookies()
        router.push('/admin/signin')
        return
      }
      
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check error:', error)
      clearAdminCookies()
      router.push('/admin/signin')
    } finally {
      setIsLoading(false)
    }
  }, [router])
  
  useEffect(() => {
    checkAuth()
  }, [pathname, checkAuth])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D35F0E] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

