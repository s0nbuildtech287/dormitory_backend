const RoomDAO = require('../dao/RoomDAO');
const StudentContractDAO = require('../dao/StudentContractDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class RoomService {
    /**
     * Get all rooms with filters
     */
    async getRooms(filters = {}) {
        try {
            return await RoomDAO.searchAndFilter(filters);
        } catch (error) {
            throw new Error(`Get rooms failed: ${error.message}`);
        }
    }

    /**
     * Get room by ID with students
     */
    async getRoomById(id) {
        try {
            const roomData = await RoomDAO.getRoomWithStudents(id);
            if (roomData.length === 0) {
                throw new Error('Room not found');
            }

            // Group students data
            const room = {
                ...roomData[0],
                students: []
            };

            roomData.forEach(row => {
                if (row.student_id) {
                    room.students.push({
                        id: row.student_id,
                        name: row.student_name,
                        email: row.student_email,
                        phone: row.student_phone,
                        contract_number: row.contract_number,
                        start_date: row.start_date,
                        end_date: row.end_date
                    });
                }
            });

            return room;
        } catch (error) {
            throw new Error(`Get room failed: ${error.message}`);
        }
    }

    /**
     * Create new room
     */
    async createRoom(data, adminId, req = null) {
        try {
            const roomId = `room-${Date.now()}`;
            const room = await RoomDAO.create({
                id: roomId,
                ...data,
                current_occupancy: 0,
                status: 'Active'
            });

            // Log action
            await LogSystemDAO.log(
                adminId,
                'CREATE_ROOM',
                'rooms',
                roomId,
                null,
                room,
                req
            );

            return room;
        } catch (error) {
            throw new Error(`Create room failed: ${error.message}`);
        }
    }

    /**
     * Update room
     */
    async updateRoom(id, data, adminId, req = null) {
        try {
            const oldData = await RoomDAO.findById(id);
            if (!oldData) {
                throw new Error('Room not found');
            }

            await RoomDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_ROOM',
                'rooms',
                id,
                oldData,
                data,
                req
            );

            return await RoomDAO.findById(id);
        } catch (error) {
            throw new Error(`Update room failed: ${error.message}`);
        }
    }

    /**
     * Delete room (only if empty)
     */
    async deleteRoom(id, adminId, req = null) {
        try {
            const room = await RoomDAO.findById(id);
            if (!room) {
                throw new Error('Room not found');
            }

            if (room.current_occupancy > 0) {
                throw new Error('Cannot delete room with occupants');
            }

            await RoomDAO.delete(id);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'DELETE_ROOM',
                'rooms',
                id,
                room,
                null,
                req
            );

            return true;
        } catch (error) {
            throw new Error(`Delete room failed: ${error.message}`);
        }
    }

    /**
     * Get available rooms for assignment
     */
    async getAvailableRooms(genderType) {
        try {
            return await RoomDAO.findAvailableRooms(genderType);
        } catch (error) {
            throw new Error(`Get available rooms failed: ${error.message}`);
        }
    }

    /**
     * Get room statistics
     */
    async getStatistics() {
        try {
            return await RoomDAO.getStatistics();
        } catch (error) {
            throw new Error(`Get statistics failed: ${error.message}`);
        }
    }

    /**
     * Update meter readings
     */
    async updateMeterReadings(roomId, electricReading, waterReading, adminId, req = null) {
        try {
            const oldData = await RoomDAO.findById(roomId);
            if (!oldData) {
                throw new Error('Room not found');
            }

            await RoomDAO.updateMeterReadings(roomId, electricReading, waterReading);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_METER_READINGS',
                'rooms',
                roomId,
                {
                    electric: oldData.electric_meter_reading,
                    water: oldData.water_meter_reading
                },
                {
                    electric: electricReading,
                    water: waterReading
                },
                req
            );

            return await RoomDAO.findById(roomId);
        } catch (error) {
            throw new Error(`Update meter readings failed: ${error.message}`);
        }
    }
}

module.exports = new RoomService();
