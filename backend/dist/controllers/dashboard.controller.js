"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
class DashboardController {
    constructor() {
        /**
         * Get comprehensive admin dashboard statistics
         */
        this.getDashboardStats = async (req, res) => {
            try {
                const stats = await this.dashboardService.getDashboardStats();
                res.json({
                    success: true,
                    message: 'Dashboard statistics retrieved successfully',
                    data: stats
                });
            }
            catch (error) {
                console.error('Get dashboard stats error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get recent activities for admin dashboard
         */
        this.getRecentActivities = async (req, res) => {
            try {
                const { limit = '10' } = req.query;
                const activities = await this.dashboardService.getRecentActivities(parseInt(limit));
                res.json({
                    success: true,
                    message: 'Recent activities retrieved successfully',
                    data: activities
                });
            }
            catch (error) {
                console.error('Get recent activities error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get sales analytics for admin dashboard
         */
        this.getSalesAnalytics = async (req, res) => {
            try {
                const { period = '30' } = req.query; // days
                const analytics = await this.dashboardService.getSalesAnalytics(parseInt(period));
                res.json({
                    success: true,
                    message: 'Sales analytics retrieved successfully',
                    data: analytics
                });
            }
            catch (error) {
                console.error('Get sales analytics error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get low stock alerts
         */
        this.getLowStockAlerts = async (req, res) => {
            try {
                const { threshold = '10' } = req.query;
                const alerts = await this.dashboardService.getLowStockAlerts(parseInt(threshold));
                res.json({
                    success: true,
                    message: 'Low stock alerts retrieved successfully',
                    data: alerts
                });
            }
            catch (error) {
                console.error('Get low stock alerts error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.dashboardService = new dashboard_service_1.DashboardService();
    }
}
exports.DashboardController = DashboardController;
