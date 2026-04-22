import { Controller, Post, Body, Get, Param, UseGuards, Req, Delete } from '@nestjs/common';
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
        return await this.mapEventsService.createEvent(dto);
    }

    // Admin: get all map events
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(EUserRole.ADMIN)
    async getAllMapEvents() {
        return await this.mapEventsService.getAllMapEvents();
    }

    // Admin: delete map event
    @Delete('admin/delete/:eventId')
    @UseGuards(RolesGuard)
    @Roles(EUserRole.ADMIN)
    async deleteMapEvent(@Param('eventId') eventId: string) {
        return await this.mapEventsService.deleteMapEvent(eventId);
    }

    // Get map events have not completed yet
    @Get('active')
    async getActiveEvents(@Req() req) {
        const userId = req.user.userId;
        return await this.mapEventsService.getActiveEventsForUser(userId);
    }

    // Complete map event
    @Post('check-in/:eventId')
    async checkInEvent(@Req() req, @Param('eventId') eventId: string) {
        const userId = req.user.userId;
        // TODO: Check distance between user and event
        return await this.mapEventsService.completeEvent(userId, eventId);
    }
}