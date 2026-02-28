'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import { getAdminToken, clearAdminCookies } from '@/lib/cookies'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const hasCheckedAuth = useRef(false)
  const isRedirecting = useRef(false)
  
  useEffect(() => {
    // Prevent multiple auth checks and redirect loops
    if (hasCheckedAuth.current || isRedirecting.current) return
    
    const checkAuth = async () => {
      try {
        hasCheckedAuth.current = true
        
        // Check both cookies and localStorage for token
        const token = getAdminToken() || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null)
        
        if (!token) {
          isRedirecting.current = true
          clearAdminCookies()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
          }
          router.replace('/admin/signin')
          setIsLoading(false)
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
          isRedirecting.current = true
          clearAdminCookies()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
          }
          router.replace('/admin/signin')
          setIsLoading(false)
          return
        }
        
        const data = await response.json()
        
        if (!data.success || !data.data) {
          isRedirecting.current = true
          clearAdminCookies()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
          }
          router.replace('/admin/signin')
          setIsLoading(false)
          return
        }
        
        setIsAuthenticated(true)
      } catch {
        isRedirecting.current = true
        clearAdminCookies()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
        }
        router.replace('/admin/signin')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router]) // Only run once on mount
  
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

