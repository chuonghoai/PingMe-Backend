import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapEvent } from './entities/map-event.entity';
import { UserEventHistory } from './entities/user-event-history.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { CreateMapEventDto } from './dto/create-map-event.dto';
import { WebsocketsService } from '../websockets/websockets.service';

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
    ) { }

    // Create new event
    async createEvent(dto: CreateMapEventDto) {
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

        return savedEvent;
    }

    // Get map events have not completed yet
    async getActiveEventsForUser(userId: string) {
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

        return await query.getMany();
    }

    // Complete map event
    async completeEvent(userId: string, eventId: string) {
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

        // TODO: Check distance between user and event

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

        return {
            message: 'Hoàn thành xuất sắc!',
            reward: { item: event.rewardItem, quantity: event.rewardQuantity }
        };
    }
}