import { Request, Response } from 'express'
import { UserPreferencesService } from '../services/user-preferences.service'
import { ApiResponse } from '../types/api.types'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export class UserPreferencesController {
  private preferencesService: UserPreferencesService

  constructor() {
    this.preferencesService = new UserPreferencesService()
  }

  /**
   * Save user preferences from onboarding
   */
  savePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const preferences = req.body

      const result = await this.preferencesService.savePreferences(userId, preferences)

      if (result.success) {
        res.json({
          success: true,
          message: 'Preferences saved successfully',
          data: result.data,
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to save preferences',
          errors: [result.error || 'Save failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Save preferences controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to save preferences'],
      } as ApiResponse)
    }
  }

  /**
   * Get user preferences
   */
  getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const result = await this.preferencesService.getPreferences(userId)

      if (result.success) {
        res.json({
          success: true,
          message: 'Preferences retrieved successfully',
          data: result.data,
        })
      } else {
        res.status(404).json({
          success: false,
          message: result.error || 'Preferences not found',
          errors: [result.error || 'Not found'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get preferences controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to get preferences'],
      } as ApiResponse)
    }
  }

  /**
   * Update user preferences
   */
  updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const updates = req.body

      const result = await this.preferencesService.updatePreferences(userId, updates)

      if (result.success) {
        res.json({
          success: true,
          message: 'Preferences updated successfully',
          data: result.data,
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to update preferences',
          errors: [result.error || 'Update failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Update preferences controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to update preferences'],
      } as ApiResponse)
    }
  }

  /**
   * Check onboarding status
   */
  checkOnboardingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const completed = await this.preferencesService.hasCompletedOnboarding(userId)

      res.json({
        success: true,
        message: 'Onboarding status retrieved',
        data: {
          onboardingCompleted: completed,
        },
      })
    } catch (error) {
      console.error('Check onboarding status error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to check onboarding status'],
      } as ApiResponse)
    }
  }
}

