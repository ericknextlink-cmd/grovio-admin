'use client'

import { usePathname } from 'next/navigation'
import AdminAuthGuard from '@/components/AdminAuthGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSignInPage = pathname === '/admin/signin'

  // Don't apply auth guard to signin page
  if (isSignInPage) {
    return <>{children}</>
  }

  // Apply auth guard to all other admin pages
  return (
    <AdminAuthGuard>
      {children}
    </AdminAuthGuard>
  )
}

