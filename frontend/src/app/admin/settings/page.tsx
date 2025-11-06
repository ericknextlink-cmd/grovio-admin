'use client'

import { useState } from 'react'
import PasswordUpdateForm from '@/components/PasswordUpdateForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  const [passwordUpdated, setPasswordUpdated] = useState(false)

  const handlePasswordUpdateSuccess = () => {
    setPasswordUpdated(true)
    setTimeout(() => setPasswordUpdated(false), 5000)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-[#D35F0E]" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your admin account settings</p>
        </div>
      </div>

      <div className="grid gap-6">
        <PasswordUpdateForm onSuccess={handlePasswordUpdateSuccess} />
      </div>
    </div>
  )
}

