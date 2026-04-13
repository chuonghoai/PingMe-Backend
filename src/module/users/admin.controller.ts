import { Controller, Get, HttpCode, HttpStatus, UseGuards, Request } from "@nestjs/common";
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

    @Get('users')
    @HttpCode(HttpStatus.OK)
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }
}