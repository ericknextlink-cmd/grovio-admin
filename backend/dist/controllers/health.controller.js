"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const health_service_1 = require("../services/health.service");
class HealthController {
    constructor() {
        /**
         * Health check endpoint
         */
        this.checkHealth = async (req, res) => {
            try {
                const healthData = await this.healthService.getHealthStatus();
                res.status(200).json(healthData);
            }
            catch (error) {
                console.error('Health check error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Health check failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        /**
         * Detailed health check with database connectivity
         */
        this.checkDetailedHealth = async (req, res) => {
            try {
                const healthData = await this.healthService.getDetailedHealthStatus();
                const statusCode = healthData.database.connected ? 200 : 503;
                res.status(statusCode).json(healthData);
            }
            catch (error) {
                console.error('Detailed health check error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Detailed health check failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.healthService = new health_service_1.HealthService();
    }
}
exports.HealthController = HealthController;
