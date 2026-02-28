import { createAdminClient } from '../config/supabase'
import { EmailService } from './email.service'

export type Recurrence = 'weekly' | 'biweekly' | 'monthly' | 'custom_days'

export interface CreateScheduledOrderParams {
  userId: string
  bundleId: string
  bundleTitle: string
  scheduledAt: string
  recurrence: Recurrence
  customDays?: number
}

export interface ScheduledOrderRow {
  id: string
  user_id: string
  bundle_id: string
  bundle_title: string | null
  scheduled_at: string
  recurrence: string
  custom_days: number | null
  reminder_sent_at: string | null
  status: string
  created_at: string
  updated_at: string
}

export class ScheduledOrderService {
  private supabase = createAdminClient()
  private emailService = new EmailService()

  async create(params: CreateScheduledOrderParams): Promise<{ success: boolean; data?: ScheduledOrderRow; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_orders')
        .insert({
          user_id: params.userId,
          bundle_id: params.bundleId,
          bundle_title: params.bundleTitle,
          scheduled_at: params.scheduledAt,
          recurrence: params.recurrence,
          custom_days: params.customDays ?? null,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, data: data as ScheduledOrderRow }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create scheduled order' }
    }
  }

  async listByUser(userId: string): Promise<{ success: boolean; data?: ScheduledOrderRow[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active'])
        .order('scheduled_at', { ascending: true })

      if (error) return { success: false, error: error.message }
      return { success: true, data: (data ?? []) as ScheduledOrderRow[] }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to list scheduled orders' }
    }
  }

  async cancel(scheduledOrderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('scheduled_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', scheduledOrderId)
        .eq('user_id', userId)

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel' }
    }
  }

  /** Mark as ordered_now so no reminder is sent; user placed order early. */
  async markOrderedNow(scheduledOrderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('scheduled_orders')
        .update({ status: 'ordered_now', updated_at: new Date().toISOString() })
        .eq('id', scheduledOrderId)
        .eq('user_id', userId)

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update' }
    }
  }

  /** Find active scheduled orders due tomorrow and send reminder email; set reminder_sent_at. */
  async sendDueReminders(): Promise<{ sent: number; errors: string[] }> {
    const errors: string[] = []
    let sent = 0
    try {
      const tomorrowStart = new Date()
      tomorrowStart.setDate(tomorrowStart.getDate() + 1)
      tomorrowStart.setHours(0, 0, 0, 0)
      const tomorrowEnd = new Date(tomorrowStart)
      tomorrowEnd.setHours(23, 59, 59, 999)

      const { data: rows, error } = await this.supabase
        .from('scheduled_orders')
        .select('*')
        .eq('status', 'active')
        .is('reminder_sent_at', null)
        .gte('scheduled_at', tomorrowStart.toISOString())
        .lte('scheduled_at', tomorrowEnd.toISOString())

      if (error) {
        return { sent: 0, errors: [error.message] }
      }

      const toSend = (rows ?? []) as ScheduledOrderRow[]
      const { data: users } = await this.supabase.from('users').select('id, email, first_name').in('id', toSend.map((r) => r.user_id))

      for (const row of toSend) {
        const user = (users ?? []).find((u: { id: string }) => u.id === row.user_id) as { email?: string; first_name?: string } | undefined
        const email = user?.email
        if (!email) {
          errors.push(`No email for user ${row.user_id}`)
          continue
        }
        const result = await this.emailService.sendScheduledOrderReminder(email, {
          userName: user?.first_name,
          scheduledDate: row.scheduled_at,
          bundleTitle: row.bundle_title ?? row.bundle_id,
        })
        if (result.success) {
          await this.supabase
            .from('scheduled_orders')
            .update({ reminder_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', row.id)
          sent++
        } else {
          errors.push(...(result.errors ?? [result.message]))
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Send reminders failed')
    }
    return { sent, errors }
  }
}
