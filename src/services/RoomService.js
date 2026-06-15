const RoomDAO = require('../dao/RoomDAO');
const StudentContractDAO = require('../dao/StudentContractDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');
const db = require('../config/database');

const ROOM_CREATE_FIELDS = [
    'room_number',
    'building',
    'floor',
    'capacity',
    'gender_type',
    'rent_price',
    'garbage_fee',
    'internet_fee',
    'parking_fee',
    'status',
    'reserved_for',
    'maintenance_reason',
    'area',
    'qr_code',
    'last_inspection_date',
    'electric_meter_reading',
    'water_meter_reading'
];

const ROOM_UPDATE_FIELDS = [
    'room_number',
    'building',
    'floor',
    'capacity',
    'gender_type',
    'rent_price',
    'garbage_fee',
    'internet_fee',
    'parking_fee',
    'status',
    'reserved_for',
    'maintenance_reason',
    'area',
    'qr_code',
    'last_inspection_date',
    'electric_meter_reading',
    'water_meter_reading'
];

function pickAllowedFields(data, allowedFields) {
    return Object.fromEntries(
        Object.entries(data || {}).filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
    );
}

function normalizePositiveInteger(value, fieldName) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    return parsed;
}

function formatRoomNumber(sequence, building, floor) {
    return `room-${sequence}-${building}-${floor}`;
}

const RESERVED_FOR_VALUES = ['general', 'freshmen', 'returning_students', 'international', 'xung_kich'];
const ROOM_BUILDING_DISPLAY_NAMES_SETTING_ID = 'room_building_display_names';

class RoomService {
    validateCreateData(data) {
        const requiredFields = ['room_number', 'building', 'floor', 'capacity', 'gender_type', 'rent_price'];
        const missingFields = requiredFields.filter((field) => {
            const value = data[field];
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required room fields: ${missingFields.join(', ')}`);
        }

        if (data.reserved_for && !RESERVED_FOR_VALUES.includes(data.reserved_for)) {
            throw new Error(`Invalid reserved_for value. Allowed values: ${RESERVED_FOR_VALUES.join(', ')}`);
        }
    }

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
            const sanitizedData = pickAllowedFields(data, ROOM_CREATE_FIELDS);
            if (!sanitizedData.room_number && sanitizedData.building && sanitizedData.floor) {
                const nextSequence = await RoomDAO.getNextRoomSequence(sanitizedData.building, Number(sanitizedData.floor));
                sanitizedData.room_number = formatRoomNumber(nextSequence, sanitizedData.building, Number(sanitizedData.floor));
            }
            this.validateCreateData(sanitizedData);

            const roomId = `room-${Date.now()}`;
            const room = await RoomDAO.create({
                id: roomId,
                ...sanitizedData,
                current_occupancy: 0,
                status: sanitizedData.status || 'Active'
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

            const sanitizedData = pickAllowedFields(data, ROOM_UPDATE_FIELDS);
            if (Object.keys(sanitizedData).length === 0) {
                throw new Error('No valid room fields provided for update');
            }

            if (sanitizedData.reserved_for && !RESERVED_FOR_VALUES.includes(sanitizedData.reserved_for)) {
                throw new Error(`Invalid reserved_for value. Allowed values: ${RESERVED_FOR_VALUES.join(', ')}`);
            }

            if (sanitizedData.reserved_for === 'xung_kich') {
                const roomWithStudents = await RoomDAO.getRoomWithStudents(id);
                const hasInternational = roomWithStudents.some(row => {
                    if (!row.student_id || !row.priority_reasons) return false;
                    const normalized = row.priority_reasons
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();
                    return ["luu hoc sinh", "quoc te", "nuoc ngoai", "du hoc sinh", "du hoc", "lao", "campuchia"].some(kw => normalized.includes(kw));
                });
                if (hasInternational) {
                    throw new Error("Không thể chuyển phòng này thành phòng xung kích vì đang có sinh viên quốc tế ở.");
                }
            }

            await RoomDAO.update(id, sanitizedData);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_ROOM',
                'rooms',
                id,
                oldData,
                sanitizedData,
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

    async getStructureMetadata() {
        try {
            return await RoomDAO.getStructureMetadata();
        } catch (error) {
            throw new Error(`Get room structure metadata failed: ${error.message}`);
        }
    }

    async getBuildingDisplayNames() {
        try {
            const query = `
                SELECT value
                FROM settings
                WHERE id = $1 AND is_active = TRUE
                LIMIT 1
            `;
            const result = await db.query(query, [ROOM_BUILDING_DISPLAY_NAMES_SETTING_ID]);
            const row = result.rows[0];
            if (!row || row.value === null || row.value === undefined) {
                return {};
            }

            if (typeof row.value === 'object') {
                return row.value;
            }

            if (typeof row.value === 'string') {
                try {
                    return JSON.parse(row.value);
                } catch {
                    return {};
                }
            }

            return {};
        } catch (error) {
            throw new Error(`Get building display names failed: ${error.message}`);
        }
    }

    async updateBuildingDisplayNames(displayNames, updatedBy = null, req = null) {
        try {
            const normalized = displayNames && typeof displayNames === 'object' && !Array.isArray(displayNames)
                ? displayNames
                : {};

            const query = `
                INSERT INTO settings (id, category, name, value, description, is_active, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, TRUE, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (id)
                DO UPDATE SET
                    category = EXCLUDED.category,
                    name = EXCLUDED.name,
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    is_active = TRUE,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;

            const values = [
                ROOM_BUILDING_DISPLAY_NAMES_SETTING_ID,
                'system',
                'room_building_display_names',
                JSON.stringify(normalized),
                'Custom display names for dormitory buildings',
                updatedBy,
            ];

            const result = await db.query(query, values);
            const saved = result.rows[0];

            if (updatedBy) {
                await LogSystemDAO.log(
                    updatedBy,
                    'UPDATE_ROOM_BUILDING_DISPLAY_NAMES',
                    'settings',
                    ROOM_BUILDING_DISPLAY_NAMES_SETTING_ID,
                    null,
                    normalized,
                    req
                );
            }

            return saved;
        } catch (error) {
            throw new Error(`Update building display names failed: ${error.message}`);
        }
    }

    buildDefaultRoomPayload(baseData, roomNumber, floor) {
        const sanitizedData = pickAllowedFields(baseData, ROOM_CREATE_FIELDS);
        return {
            id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            room_number: roomNumber,
            building: sanitizedData.building,
            floor,
            capacity: sanitizedData.capacity,
            gender_type: sanitizedData.gender_type,
            rent_price: sanitizedData.rent_price,
            garbage_fee: sanitizedData.garbage_fee ?? 0,
            internet_fee: sanitizedData.internet_fee ?? 0,
            parking_fee: sanitizedData.parking_fee ?? 0,
            electric_meter_reading: sanitizedData.electric_meter_reading ?? 0,
            water_meter_reading: sanitizedData.water_meter_reading ?? 0,
            status: sanitizedData.status || 'Active',
            maintenance_reason: sanitizedData.maintenance_reason ?? null,
            area: sanitizedData.area ?? null,
            qr_code: sanitizedData.qr_code ?? null,
            last_inspection_date: sanitizedData.last_inspection_date ?? null,
            reserved_for: sanitizedData.reserved_for ?? 'general',
            current_occupancy: 0
        };
    }

    async createFloorRooms(data, adminId, req = null) {
        try {
            const roomsCount = normalizePositiveInteger(data.rooms_count, 'rooms_count');
            const floor = normalizePositiveInteger(data.floor, 'floor');
            const roomStartNumber = data.room_start_number === undefined
                ? await RoomDAO.getNextRoomSequence(data.building, floor, 100)
                : normalizePositiveInteger(data.room_start_number, 'room_start_number');

            const sanitizedData = pickAllowedFields(data, ROOM_CREATE_FIELDS);
            sanitizedData.floor = floor;
            this.validateCreateData({
                ...sanitizedData,
                room_number: 'TEMP'
            });

            const roomsToCreate = [];
            for (let index = 0; index < roomsCount; index++) {
                const roomNumber = formatRoomNumber(roomStartNumber + index, sanitizedData.building, floor);
                roomsToCreate.push(this.buildDefaultRoomPayload(sanitizedData, roomNumber, floor));
            }

            const duplicateNumbers = roomsToCreate
                .map((room) => room.room_number)
                .filter((roomNumber, index, allNumbers) => allNumbers.indexOf(roomNumber) !== index);
            if (duplicateNumbers.length > 0) {
                throw new Error(`Duplicate room numbers in request: ${duplicateNumbers.join(', ')}`);
            }

            const existingRoomNumbers = await RoomDAO.findExistingRoomNumbers(roomsToCreate.map((room) => room.room_number));
            if (existingRoomNumbers.length > 0) {
                throw new Error(`Room numbers already exist: ${existingRoomNumbers.join(', ')}`);
            }

            const createdRooms = await RoomDAO.createMany(roomsToCreate);
            await LogSystemDAO.log(
                adminId,
                'CREATE_FLOOR_ROOMS',
                'rooms',
                null,
                null,
                {
                    building: sanitizedData.building,
                    floor,
                    rooms_count: roomsCount,
                    room_numbers: createdRooms.map((room) => room.room_number)
                },
                req
            );

            return createdRooms;
        } catch (error) {
            throw new Error(`Create floor rooms failed: ${error.message}`);
        }
    }

    async createBuildingRooms(data, adminId, req = null) {
        try {
            const floorsCount = normalizePositiveInteger(data.floors_count, 'floors_count');
            const roomsPerFloor = normalizePositiveInteger(data.rooms_per_floor, 'rooms_per_floor');
            const startFloor = data.start_floor === undefined ? 1 : normalizePositiveInteger(data.start_floor, 'start_floor');
            const roomStartNumber = data.room_start_number === undefined ? 100 : normalizePositiveInteger(data.room_start_number, 'room_start_number');

            const sanitizedData = pickAllowedFields(data, ROOM_CREATE_FIELDS);
            this.validateCreateData({
                ...sanitizedData,
                floor: startFloor,
                room_number: 'TEMP'
            });

            const roomsToCreate = [];
            for (let floorOffset = 0; floorOffset < floorsCount; floorOffset++) {
                const floor = startFloor + floorOffset;
                const nextSequence = await RoomDAO.getNextRoomSequence(sanitizedData.building, floor, roomStartNumber);
                for (let roomIndex = 0; roomIndex < roomsPerFloor; roomIndex++) {
                    const roomNumber = formatRoomNumber(nextSequence + roomIndex, sanitizedData.building, floor);
                    roomsToCreate.push(this.buildDefaultRoomPayload(sanitizedData, roomNumber, floor));
                }
            }

            const existingRoomNumbers = await RoomDAO.findExistingRoomNumbers(roomsToCreate.map((room) => room.room_number));
            if (existingRoomNumbers.length > 0) {
                throw new Error(`Room numbers already exist: ${existingRoomNumbers.join(', ')}`);
            }

            const createdRooms = await RoomDAO.createMany(roomsToCreate);
            await LogSystemDAO.log(
                adminId,
                'CREATE_BUILDING_ROOMS',
                'rooms',
                null,
                null,
                {
                    building: sanitizedData.building,
                    floors_count: floorsCount,
                    rooms_per_floor: roomsPerFloor,
                    room_numbers: createdRooms.map((room) => room.room_number)
                },
                req
            );

            return createdRooms;
        } catch (error) {
            throw new Error(`Create building rooms failed: ${error.message}`);
        }
    }

    /**
     * Batch update reserved_for for building/floor rooms
     */
    async updateBatchReservedFor(building, floor, reservedFor, adminId, req = null) {
        try {
            if (!building) {
                throw new Error("Building is required for batch update");
            }
            if (reservedFor && !RESERVED_FOR_VALUES.includes(reservedFor)) {
                throw new Error(`Invalid reserved_for value. Allowed values: ${RESERVED_FOR_VALUES.join(', ')}`);
            }

            if (reservedFor === 'xung_kich') {
                let checkQuery = `
                    SELECT r.id, r.room_number, c.priority_reasons
                    FROM rooms r
                    JOIN student_contracts c ON r.id = c.room_id
                    WHERE r.building = $1 AND c.status = 'Active'
                `;
                const checkParams = [building];
                if (floor !== undefined && floor !== null) {
                    checkQuery += " AND r.floor = $2";
                    checkParams.push(Number(floor));
                }
                const checkRes = await db.query(checkQuery, checkParams);
                const hasInternational = checkRes.rows.some(row => {
                    if (!row.priority_reasons) return false;
                    const normalized = row.priority_reasons
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();
                    return ["luu hoc sinh", "quoc te", "nuoc ngoai", "du hoc sinh", "du hoc", "lao", "campuchia"].some(kw => normalized.includes(kw));
                });
                if (hasInternational) {
                    throw new Error("Không thể chuyển các phòng thành phòng xung kích vì đang có sinh viên quốc tế ở.");
                }
            }

            let query = `
                UPDATE rooms 
                SET reserved_for = $1, updated_at = NOW() 
                WHERE building = $2
            `;
            const params = [reservedFor || 'general', building];

            if (floor !== undefined && floor !== null) {
                query += " AND floor = $3";
                params.push(Number(floor));
            }

            query += " RETURNING *";

            const result = await db.query(query, params);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'BATCH_UPDATE_ROOMS_RESERVED_FOR',
                'rooms',
                null,
                null,
                { building, floor, reserved_for: reservedFor, affected_count: result.rowCount },
                req
            );

            return result.rows;
        } catch (error) {
            throw new Error(`Batch update reserved_for failed: ${error.message}`);
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
