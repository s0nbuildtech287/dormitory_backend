const ContractService = require('../services/ContractService');

class ContractController {
    /**
     * Get all contracts
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                roomId: req.query.roomId,
                searchTerm: req.query.search
            };

            const contracts = await ContractService.getContracts(filters);
            res.json({
                success: true,
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get contract by ID
     */
    async getById(req, res, next) {
        try {
            const contract = await ContractService.getContractById(req.params.id);
            res.json({
                success: true,
                data: contract
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new contract
     */
    async create(req, res, next) {
        try {
            const contract = await ContractService.createContract(req.body, req.user.userId, req);
            res.status(201).json({
                success: true,
                message: 'Contract created successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update contract
     */
    async update(req, res, next) {
        try {
            const contract = await ContractService.updateContract(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Contract updated successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Terminate contract
     */
    async terminate(req, res, next) {
        try {
            const contract = await ContractService.terminateContract(req.params.id, req.user.userId, req);
            res.json({
                success: true,
                message: 'Contract terminated successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get contracts by user
     */
    async getByUser(req, res, next) {
        try {
            const userId = req.params.userId || req.user.userId;
            const contracts = await ContractService.getContractsByUser(userId);
            res.json({
                success: true,
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get expiring contracts
     */
    async getExpiring(req, res, next) {
        try {
            const days = req.query.days ? parseInt(req.query.days) : 30;
            const contracts = await ContractService.getExpiringContracts(days);
            res.json({
                success: true,
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create contract from approved registration
     */
    async createFromRegistration(req, res, next) {
        try {
            const { registrationId, roomId, ...contractData } = req.body;

            if (!registrationId || !roomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Registration ID and Room ID are required'
                });
            }

            const result = await ContractService.createFromRegistration(
                registrationId,
                roomId,
                contractData,
                req.user.userId,
                req
            );
            res.status(201).json({
                success: true,
                message: 'Contract created from registration successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ContractController();
