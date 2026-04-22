import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { MapEventsService } from './map-events.service';
import { CreateMapEventDto } from './dto/create-map-event.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { RolesGuard } from '../../core/security/roles/roles.guard';
import { Roles } from '../../core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('map/events')
@UseGuards(JwtAuthGuard)
export class MapEventsController {
    constructor(private readonly mapEventsService: MapEventsService) { }

    // Create new map event
    @Post('admin/create')
    @UseGuards(RolesGuard)
    @Roles(EUserRole.ADMIN)
    async createEvent(@Body() dto: CreateMapEventDto) {
        const event = await this.mapEventsService.createEvent(dto);
        return {
            success: true,
            message: 'Đã tạo sự kiện và phát thông báo toàn server',
            data: event,
        };
    }

    // Get map events have not completed yet
    @Get('active')
    async getActiveEvents(@Req() req) {
        const userId = req.user.userId;
        const events = await this.mapEventsService.getActiveEventsForUser(userId);
        return {
            success: true,
            data: events,
        };
    }

    // Complete map event
    @Post('check-in/:eventId')
    async checkInEvent(@Req() req, @Param('eventId') eventId: string) {
        const userId = req.user.userId;
        // TODO: Check distance between user and event
        const result = await this.mapEventsService.completeEvent(userId, eventId);
        return {
            success: true,
            data: result,
        };
    }
}