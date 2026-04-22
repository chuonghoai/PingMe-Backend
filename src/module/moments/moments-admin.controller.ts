import { Controller, Get, Delete, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MomentsAdminService } from './moments-admin.service';
import { RolesGuard } from 'src/core/security/roles/roles.guard';
import { Roles } from 'src/core/security/roles/roles.decorator';
import { EUserRole } from '../users/enums/user.enum';

@Controller('admin/moments')
@UseGuards(RolesGuard)
@Roles(EUserRole.ADMIN)
export class MomentsAdminController {
    constructor(private readonly adminMomentsService: MomentsAdminService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async getAllMoments(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        return this.adminMomentsService.getAllMoments(parseInt(page), parseInt(limit));
    }

    @Get('reported')
    @HttpCode(HttpStatus.OK)
    async getReportedMoments(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        return this.adminMomentsService.getReportedMoments(parseInt(page), parseInt(limit));
    }

    @Get('reported/:id')
    @HttpCode(HttpStatus.OK)
    async getReportDetail(@Param('id') momentId: string) {
        return this.adminMomentsService.getReportedMomentDetail(momentId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteMoment(@Param('id') momentId: string) {
        return this.adminMomentsService.deleteReportedMoment(momentId);
    }
}