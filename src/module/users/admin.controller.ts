import { Controller, Get, HttpCode, HttpStatus, UseGuards, Request, Post, Body, Param, Query, Patch } from "@nestjs/common";
import { JwtAuthGuard } from "src/core/security/jwt/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { Roles } from "src/core/security/roles/roles.decorator";
import { EUserRole } from "./enums/user.enum";
import { RolesGuard } from "src/core/security/roles/roles.guard";

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EUserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // Get all user
    @Get('users')
    @HttpCode(HttpStatus.OK)
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }

    // Get stats: total users, onlines, locks
    @Get('stats')
    @HttpCode(HttpStatus.OK)
    async getStats(@Request() req: any) {
        const adminId = req.user.userId;
        return this.adminService.getStats(adminId);
    }

    // Toggle lock user account
    @Patch('users/:id/toggle/lock')
    @HttpCode(HttpStatus.OK)
    async toggleLockUser(
        @Param('id') id: string,
    ) {
        return this.adminService.toogleLockUser(id);
    }
}