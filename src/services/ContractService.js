const StudentContractDAO = require('../dao/StudentContractDAO');
const RoomDAO = require('../dao/RoomDAO');
const UserDAO = require('../dao/UserDAO');
const RegisterFormDAO = require('../dao/RegisterFormDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class ContractService {
    /**
     * Get all contracts with filters
     */
    async getContracts(filters = {}) {
        try {
            return await StudentContractDAO.searchAndFilter(filters);
        } catch (error) {
            throw new Error(`Get contracts failed: ${error.message}`);
        }
    }

    /**
     * Get contract by ID
     */
    async getContractById(id) {
        try {
            const contract = await StudentContractDAO.getContractDetails(id);
            if (!contract) {
                throw new Error('Contract not found');
            }
            return contract;
        } catch (error) {
            throw new Error(`Get contract failed: ${error.message}`);
        }
    }

    /**
     * Create new contract (assign student to room)
     */
    async createContract(data, adminId, req = null) {
        try {
            // Validate room availability
            const room = await RoomDAO.findById(data.room_id);
            if (!room) {
                throw new Error('Room not found');
            }
            if (room.current_occupancy >= room.capacity) {
                throw new Error('Room is full');
            }

            // Validate user
            const user = await UserDAO.findById(data.user_id);
            if (!user) {
                throw new Error('User not found');
            }

            // Check gender match
            if (room.gender_type !== user.gender && user.gender) {
                throw new Error('Gender mismatch with room type');
            }

            // Check if user already has active contract
            const existingContract = await StudentContractDAO.findActiveContractByUser(data.user_id);
            if (existingContract) {
                throw new Error('User already has an active contract');
            }

            // Generate contract number
            const contractNumber = `HD-${Date.now()}`;
            const contractId = `contract-${Date.now()}`;

            const contractData = {
                id: contractId,
                contract_number: contractNumber,
                ...data,
                status: 'Active',
                created_by: adminId
            };

            // Create contract and update room (atomic transaction)
            const contract = await StudentContractDAO.createContractWithRoom(contractData);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'CREATE_CONTRACT',
                'student_contracts',
                contractId,
                null,
                contract,
                req
            );

            return contract;
        } catch (error) {
            throw new Error(`Create contract failed: ${error.message}`);
        }
    }

    /**
     * Update contract
     */
    async updateContract(id, data, adminId, req = null) {
        try {
            const oldData = await StudentContractDAO.findById(id);
            if (!oldData) {
                throw new Error('Contract not found');
            }

            await StudentContractDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_CONTRACT',
                'student_contracts',
                id,
                oldData,
                data,
                req
            );

            return await StudentContractDAO.getContractDetails(id);
        } catch (error) {
            throw new Error(`Update contract failed: ${error.message}`);
        }
    }

    /**
     * Terminate contract
     */
    async terminateContract(id, adminId, req = null) {
        try {
            const oldData = await StudentContractDAO.findById(id);
            if (!oldData) {
                throw new Error('Contract not found');
            }

            await StudentContractDAO.terminateContract(id);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'TERMINATE_CONTRACT',
                'student_contracts',
                id,
                { status: oldData.status },
                { status: 'Terminated' },
                req
            );

            return await StudentContractDAO.getContractDetails(id);
        } catch (error) {
            throw new Error(`Terminate contract failed: ${error.message}`);
        }
    }

    /**
     * Get contracts by user
     */
    async getContractsByUser(userId) {
        try {
            return await StudentContractDAO.findByUserId(userId);
        } catch (error) {
            throw new Error(`Get user contracts failed: ${error.message}`);
        }
    }

    /**
     * Get expiring contracts
     */
    async getExpiringContracts(days = 30) {
        try {
            return await StudentContractDAO.getExpiringContracts(days);
        } catch (error) {
            throw new Error(`Get expiring contracts failed: ${error.message}`);
        }
    }

    /**
     * Create contract from approved registration
     */
    async createFromRegistration(registrationId, roomId, contractData, adminId, req = null) {
        try {
            // Get registration
            const registration = await RegisterFormDAO.findById(registrationId);
            if (!registration) {
                throw new Error('Registration not found');
            }
            if (registration.status !== 'Chấp nhận') {
                throw new Error('Registration must be approved first');
            }

            // Create user account for student
            const userId = `user-${Date.now()}`;
            const bcrypt = require('bcryptjs');
            const defaultPassword = await bcrypt.hash('123456', 10); // Default password

            await UserDAO.create({
                id: userId,
                email: registration.email,
                password: defaultPassword,
                full_name: registration.student_name,
                role: 'STUDENT',
                phone: registration.phone
            });

            // Create contract
            const contract = await this.createContract({
                user_id: userId,
                room_id: roomId,
                register_form_id: registrationId,
                ...contractData
            }, adminId, req);

            return { user_id: userId, contract };
        } catch (error) {
            throw new Error(`Create contract from registration failed: ${error.message}`);
        }
    }
}

module.exports = new ContractService();
