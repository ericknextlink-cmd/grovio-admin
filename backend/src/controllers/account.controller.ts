import { Request, Response } from 'express'
import { AccountService } from '../services/account.service'
import { ApiResponse } from '../types/api.types'
import { AuthRequest } from '../middleware/auth.middleware'

export class AccountController {
  private accountService: AccountService

  constructor() {
    this.accountService = new AccountService()
  }

  /**
   * Check email status
   */
  checkEmailStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          errors: ['Email address is missing']
        } as ApiResponse)
        return
      }

      const result = await this.accountService.checkEmailStatus(email)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Check email status controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while checking email status']
      } as ApiResponse)
    }
  }

  /**
   * Delete user account (soft delete)
   */
  deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { reason } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          errors: ['Please sign in']
        } as ApiResponse)
        return
      }

      const result = await this.accountService.deleteAccount(userId, reason)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Delete account controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while deleting account']
      } as ApiResponse)
    }
  }

  /**
   * Initiate account recovery
   */
  initiateRecovery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          errors: ['Email address is missing']
        } as ApiResponse)
        return
      }

      const result = await this.accountService.initiateAccountRecovery(email)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Initiate recovery controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while initiating recovery']
      } as ApiResponse)
    }
  }

  /**
   * Complete account recovery
   */
  completeRecovery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, recoveryToken, newPassword } = req.body

      if (!email || !recoveryToken || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: ['Email, recovery token, and new password are required']
        } as ApiResponse)
        return
      }

      const result = await this.accountService.completeAccountRecovery(email, recoveryToken, newPassword)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Complete recovery controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while completing recovery']
      } as ApiResponse)
    }
  }
}
