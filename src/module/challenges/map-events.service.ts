import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapEvent } from './entities/map-event.entity';
import { UserEventHistory } from './entities/user-event-history.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { CreateMapEventDto } from './dto/create-map-event.dto';
import { WebsocketsService } from '../websockets/websockets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';

@Injectable()
export class MapEventsService {
    constructor(
        @InjectRepository(MapEvent)
        private readonly eventRepo: Repository<MapEvent>,
        @InjectRepository(UserEventHistory)
        private readonly historyRepo: Repository<UserEventHistory>,
        @InjectRepository(UserInventory)
        private readonly inventoryRepo: Repository<UserInventory>,
        private readonly websocketsService: WebsocketsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // Create new event
    async createEvent(dto: CreateMapEventDto): Promise<ApiResponse<any>> {
        const event = this.eventRepo.create({
            ...dto,
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
        });

        const savedEvent = await this.eventRepo.save(event);

        this.websocketsService.emitToAll('new_map_event', {
            title: '🌟 Sự kiện Bản đồ mới!',
            message: `Nhiệm vụ: ${savedEvent.name} vừa xuất hiện. Phần thưởng: ${savedEvent.rewardQuantity} ${savedEvent.rewardItem}`,
            eventInfo: savedEvent,
        });

        this.notificationsService.createMapEventNotificationToAll(
            savedEvent.name,
            savedEvent.rewardItem,
            savedEvent.rewardQuantity,
            savedEvent.id,
        ).catch(e => console.log(e));

        return new ApiResponse(true, 'Đã tạo sự kiện thành công', savedEvent);
    }

    // Admin: get all map events
    async getAllMapEvents(): Promise<ApiResponse<any>> {
        const result = await this.eventRepo.find();
        return new ApiResponse(true, 'Lấy danh sách sự kiện thành công', result);
    }

    // Admin: delete map event
    async deleteMapEvent(eventId: string): Promise<ApiResponse<any>> {
        const event = await this.eventRepo.findOne({ where: { id: eventId } });
        if (!event) throw new BadRequestException('Sự kiện không tồn tại');
        await this.eventRepo.remove(event);
        return new ApiResponse(true, 'Đã xóa sự kiện', null);
    }

    // Get map events have not completed yet
    async getActiveEventsForUser(userId: string): Promise<ApiResponse<any>> {
        const now = new Date();

        const completedRecords = await this.historyRepo.find({
            where: { userId },
            select: ['eventId'],
        });
        const completedIds = completedRecords.map((record) => record.eventId);

        const query = this.eventRepo.createQueryBuilder('event')
            .where('event.startTime <= :now', { now })
            .andWhere('event.endTime >= :now', { now });

        if (completedIds.length > 0) {
            query.andWhere('event.id NOT IN (:...completedIds)', { completedIds });
        }

        return new ApiResponse(true, 'Lấy danh sách sự kiện thành công', await query.getMany());
    }

    // Complete map event
    async completeEvent(userId: string, eventId: string, userLat: number, userLng: number): Promise<ApiResponse<any>> {
        const event = await this.eventRepo.findOne({ where: { id: eventId } });
        if (!event) throw new BadRequestException('Sự kiện không tồn tại');

        const now = new Date();
        if (now < event.startTime || now > event.endTime) {
            throw new BadRequestException('Sự kiện không diễn ra vào lúc này');
        }

        const hasCompleted = await this.historyRepo.findOne({ where: { userId, eventId } });
        if (hasCompleted) {
            throw new BadRequestException('Bạn đã nhận thưởng từ sự kiện này rồi');
        }

        const distance = this.calculateDistance(event.latitude, event.longitude, userLat, userLng);
        const requiredDistance = 20;
        if (distance > requiredDistance) {
            console.log('Failed to check in:', {
                required: `${requiredDistance * 1000}m`,
                actual: `${distance * 1000}m`,
            });
            return new ApiResponse(false, `Bạn quá xa sự kiện! Cần ở trong bán kính ${requiredDistance * 1000}m.`, null);
        }

        await this.historyRepo.save({ userId, eventId });
        let inventory = await this.inventoryRepo.findOne({
            where: { userId, itemType: event.rewardItem },
        });

        if (inventory) {
            inventory.quantity += event.rewardQuantity;
            await this.inventoryRepo.save(inventory);
        } else {
            await this.inventoryRepo.save(
                this.inventoryRepo.create({
                    userId,
                    itemType: event.rewardItem,
                    quantity: event.rewardQuantity,
                }),
            );
        }

        return new ApiResponse(true, 'Hoàn thành xuất sắc!', null);
    }

    // Helper: Calculate distance between two points in kilometers
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }
}