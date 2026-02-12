const RegistrationService = require('../services/RegistrationService');
const upload = require('../middlewares/upload');

class RegistrationController {
    /**
     * Get all registrations
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                gender: req.query.gender,
                searchTerm: req.query.search,
                aiSuggestion: req.query.aiSuggestion,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };

            const registrations = await RegistrationService.getRegistrations(filters);
            res.json({
                success: true,
                data: registrations
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get registration by ID
     */
    async getById(req, res, next) {
        try {
            const registration = await RegistrationService.getRegistrationById(req.params.id);
            res.json({
                success: true,
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new registration with validation and AI scoring
     */
    async create(req, res, next) {
        try {
            // Validate authentication
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }

            // Validate authorization (only admin can create)
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Only admins can create registrations'
                });
            }

            const registration = await RegistrationService.createRegistration(req.body, req);
            res.status(201).json({
                success: true,
                message: 'Registration created successfully',
                data: registration
            });
        } catch (error) {
            // Check for validation errors
            if (error.message.includes('Missing required fields') ||
                error.message.includes('Invalid') ||
                error.message.includes('already exists')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            // Pass other errors to error handler
            next(error);
        }
    }

    /**
     * Update registration
     */
    async update(req, res, next) {
        try {
            const registration = await RegistrationService.updateRegistration(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Registration updated successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve registration
     */
    async approve(req, res, next) {
        try {
            const { note } = req.body;
            const registration = await RegistrationService.approveRegistration(
                req.params.id,
                req.user.userId,
                note,
                req
            );
            res.json({
                success: true,
                message: 'Registration approved successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject registration
     */
    async reject(req, res, next) {
        try {
            const { note } = req.body;
            if (!note) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection note is required'
                });
            }

            const registration = await RegistrationService.rejectRegistration(
                req.params.id,
                req.user.userId,
                note,
                req
            );
            res.json({
                success: true,
                message: 'Registration rejected successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete registration
     */
    async delete(req, res, next) {
        try {
            // Validate authentication
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }

            // Validate authorization (only admin can delete)
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Only admins can delete registrations'
                });
            }

            const registration = await RegistrationService.deleteRegistration(
                req.params.id,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Registration deleted successfully',
                data: registration
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * Import registrations from Excel
     */
    async importExcel(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Excel file is required'
                });
            }

            // Use 'system' as userId if no authentication (for testing)
            const userId = req.user?.userId || 'system';

            const result = await RegistrationService.importFromExcel(
                req.file.path,
                userId,
                req
            );
            res.json({
                success: true,
                message: `Imported ${result.success} registrations`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get statistics
     */
    async getStatistics(req, res, next) {
        try {
            const statistics = await RegistrationService.getStatistics();
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Recalculate AI scores for all registrations
     * Used when admin updates scoring weights/settings
     */
    async recalculateScores(req, res, next) {
        try {
            const result = await RegistrationService.recalculateAllScores(
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: `Recalculated ${result.updated} registrations`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RegistrationController();
