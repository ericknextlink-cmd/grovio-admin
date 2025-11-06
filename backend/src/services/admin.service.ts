import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createAdminClient } from '../config/supabase'

export interface AdminUser {
  id: string
  username: string
  email: string
  full_name: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface AdminLoginResponse {
  admin: Omit<AdminUser, 'password_hash'>
  token: string
}

export class AdminService {
  private supabase = createAdminClient()

  /**
   * Admin login - accepts username or email
   */
  async login(usernameOrEmail: string, password: string): Promise<{
    success: boolean
    message: string
    data?: AdminLoginResponse
  }> {
    try {
      // Determine if input is email or username
      const isEmail = usernameOrEmail.includes('@')
      
      // Get admin user by username or email
      const query = this.supabase
        .from('admin_users')
        .select('*')
        .eq('is_active', true)
      
      if (isEmail) {
        query.eq('email', usernameOrEmail.toLowerCase().trim())
      } else {
        query.eq('username', usernameOrEmail.trim())
      }
      
      const { data: admin, error } = await query.single()

      if (error || !admin) {
        return {
          success: false,
          message: 'Invalid username/email or password'
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password_hash)

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials'
        }
      }

      // Update last login
      await this.supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id)

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminId: admin.id, 
          username: admin.username, 
          role: admin.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      )

      // Remove password hash from response
      const { password_hash, ...adminData } = admin

      return {
        success: true,
        message: 'Login successful',
        data: {
          admin: adminData,
          token
        }
      }
    } catch (error) {
      console.error('Admin login error:', error)
      return {
        success: false,
        message: 'Login failed'
      }
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<Omit<AdminUser, 'password_hash'> | null> {
    try {
      const { data: admin, error } = await this.supabase
        .from('admin_users')
        .select('id, username, email, full_name, role, is_active, last_login_at, created_at, updated_at')
        .eq('id', adminId)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        return null
      }

      return admin
    } catch (error) {
      console.error('Get admin by ID error:', error)
      return null
    }
  }

  /**
   * Update admin profile
   */
  async updateAdmin(adminId: string, updates: Partial<Pick<AdminUser, 'full_name' | 'email'>>): Promise<{
    success: boolean
    message: string
    data?: Omit<AdminUser, 'password_hash'>
  }> {
    try {
      const { data: admin, error } = await this.supabase
        .from('admin_users')
        .update(updates)
        .eq('id', adminId)
        .select('id, username, email, full_name, role, is_active, last_login_at, created_at, updated_at')
        .single()

      if (error || !admin) {
        return {
          success: false,
          message: 'Failed to update admin profile'
        }
      }

      return {
        success: true,
        message: 'Admin profile updated successfully',
        data: admin
      }
    } catch (error) {
      console.error('Update admin error:', error)
      return {
        success: false,
        message: 'Failed to update admin profile'
      }
    }
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Get current admin data
      const { data: admin, error } = await this.supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', adminId)
        .single()

      if (error || !admin) {
        return {
          success: false,
          message: 'Admin not found'
        }
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash)

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Current password is incorrect'
        }
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      const { error: updateError } = await this.supabase
        .from('admin_users')
        .update({ password_hash: newPasswordHash })
        .eq('id', adminId)

      if (updateError) {
        return {
          success: false,
          message: 'Failed to update password'
        }
      }

      return {
        success: true,
        message: 'Password updated successfully'
      }
    } catch (error) {
      console.error('Change password error:', error)
      return {
        success: false,
        message: 'Failed to update password'
      }
    }
  }

  /**
   * Verify admin token
   */
  verifyToken(token: string): { adminId: string; username: string; role: string } | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
      return {
        adminId: decoded.adminId,
        username: decoded.username,
        role: decoded.role
      }
    } catch (error) {
      return null
    }
  }
}
