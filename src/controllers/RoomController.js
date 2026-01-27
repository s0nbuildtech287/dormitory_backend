const RoomService = require('../services/RoomService');

class RoomController {
    /**
     * Get all rooms
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                building: req.query.building,
                genderType: req.query.genderType,
                status: req.query.status,
                searchTerm: req.query.search,
                occupancyStatus: req.query.occupancyStatus
            };

            const rooms = await RoomService.getRooms(filters);
            res.json({
                success: true,
                data: rooms
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get room by ID
     */
    async getById(req, res, next) {
        try {
            const room = await RoomService.getRoomById(req.params.id);
            res.json({
                success: true,
                data: room
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new room
     */
    async create(req, res, next) {
        try {
            const room = await RoomService.createRoom(req.body, req.user.userId, req);
            res.status(201).json({
                success: true,
                message: 'Room created successfully',
                data: room
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update room
     */
    async update(req, res, next) {
        try {
            const room = await RoomService.updateRoom(req.params.id, req.body, req.user.userId, req);
            res.json({
                success: true,
                message: 'Room updated successfully',
                data: room
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete room
     */
    async delete(req, res, next) {
        try {
            await RoomService.deleteRoom(req.params.id, req.user.userId, req);
            res.json({
                success: true,
                message: 'Room deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get available rooms
     */
    async getAvailable(req, res, next) {
        try {
            const { genderType } = req.query;
            const rooms = await RoomService.getAvailableRooms(genderType);
            res.json({
                success: true,
                data: rooms
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
            const statistics = await RoomService.getStatistics();
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update meter readings
     */
    async updateMeterReadings(req, res, next) {
        try {
            const { electric, water } = req.body;
            
            if (electric === undefined || water === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Electric and water readings are required'
                });
            }

            const room = await RoomService.updateMeterReadings(
                req.params.id,
                electric,
                water,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Meter readings updated successfully',
                data: room
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RoomController();
