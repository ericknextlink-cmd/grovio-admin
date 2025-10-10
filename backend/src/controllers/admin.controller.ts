import { Request, Response } from 'express'
import { AdminService } from '../services/admin.service'
import { ApiResponse } from '../types/api.types'

export class AdminController {
  private adminService: AdminService

  constructor() {
    this.adminService = new AdminService()
  }

  /**
   * Admin login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required'
        } as ApiResponse<null>)
        return
      }

      const result = await this.adminService.login(username, password)

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Admin login error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get admin profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId

      const admin = await this.adminService.getAdminById(adminId)

      if (!admin) {
        res.status(404).json({
          success: false,
          message: 'Admin not found'
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Admin profile retrieved successfully',
        data: admin
      } as ApiResponse<typeof admin>)
    } catch (error) {
      console.error('Get admin profile error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Update admin profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId
      const updates = req.body

      const result = await this.adminService.updateAdmin(adminId, updates)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Update admin profile error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Change admin password
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId
      const { currentPassword, newPassword } = req.body

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        } as ApiResponse<null>)
        return
      }

      const result = await this.adminService.changePassword(adminId, currentPassword, newPassword)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Admin logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a more complex system, you might want to blacklist the token
      res.json({
        success: true,
        message: 'Logged out successfully'
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Admin logout error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}
