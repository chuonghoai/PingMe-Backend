import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { UserRepository } from "./users.repository";
import { EUserActivityType, EUserGender, EUserRole, EUserStatus } from "./enums/user.enum";
import * as bcrypt from 'bcrypt';
import { ApiResponse } from "src/core/dto/ApiResponse.dto";
import { ConversationParticipantRepository } from "../conversations/repository/conversation-participant.repository";
import { CustomException } from "src/core/exceptions/custom.exception";
import { ENV_VARS } from "src/constants/env.constants";
import { ChangePasswordDto } from "./dto/change-password-request.dto";
import { EItemType, ITEM_DEFINITIONS } from "../challenges/entities/challenge-definition";
import { EUpdateInventoryAction } from "./dto/update-inventory.dto";
import { Repository } from "typeorm";
import { UserInventory } from "../challenges/entities/user-inventory.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AdminService implements OnModuleInit {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly participantRepo: ConversationParticipantRepository,
        @InjectRepository(UserInventory)
        private readonly inventoryRepo: Repository<UserInventory>,
    ) { }

    async onModuleInit() {
        await this.seedDefaultAdmin();
    }

    // Create default admin account
    private async seedDefaultAdmin() {
        const adminEmail = process.env.ADMIN_MAIL || 'manggia098@gmail.com';
        const existingAdmin = await this.userRepository.findByEmail(adminEmail);

        if (!existingAdmin) {
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const adminUser = this.userRepository.create({
                fullname: 'System Administrator',
                email: adminEmail,
                password: hashedPassword,
                phone: '0968714329',
                avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff&size=256&bold=true',
                status: EUserStatus.ACTIVE,
                gender: EUserGender.MALE,
                dob: new Date('1990-01-01'),
                role: EUserRole.ADMIN,
                lastActiveAt: new Date(),
                isOnline: false,
                lat: 21.028511,
                lng: 105.804817,
                username: 'superadmin',
                address: 'Hệ thống PingMe',
                locationUpdatedAt: new Date(),
                statusMessage: 'Administrator of PingMe System',
                activityType: EUserActivityType.OFFLINE,
                battery: 100,
                speed: 0,
                isHideMyLocation: true,
            });

            await this.userRepository.save(adminUser);
            this.logger.log(`Đã tạo tài khoản Admin mặc định: ${adminEmail} | Mật khẩu: ${adminPassword}`);
        } else {
            this.logger.log('Tài khoản Admin đã tồn tại, bỏ qua bước khởi tạo.');
        }
    }

    // Get all users in database
    async getAllUsers() {
        const users = await this.userRepository.find();
        return new ApiResponse(true, 'Lấy danh sách người dùng thành công', users);
    }

    async getStats(adminId: string) {
        const [totalUsers, totalOnlines, totalLocks, unreadResult] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { isOnline: true } }),
            this.userRepository.count({ where: { status: EUserStatus.LOCKED } }),
            this.participantRepo.createQueryBuilder('cp')
                .select('SUM(cp.unreadCount)', 'total')
                .where('cp.userId = :adminId', { adminId })
                .getRawOne()
        ]);
        const totalUnreadCount = unreadResult?.total ? parseInt(unreadResult.total, 10) : 0;

        return new ApiResponse(true, 'Lấy thống kê thành công', {
            totalUsers,
            totalOnlines,
            totalLocks,
            totalUnreadCount
        })
    }

    // Lock user
    async toogleLockUser(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
        }
        user.status = user.status === EUserStatus.LOCKED ? EUserStatus.ACTIVE : EUserStatus.LOCKED;
        const messageRes = user.status === EUserStatus.LOCKED ? 'Khóa tài khoản thành công' : 'Mở khóa tài khoản thành công';
        await this.userRepository.save(user);
        return new ApiResponse(true, messageRes, null);
    }

    async changePassword(userId: string, dto: ChangePasswordDto): Promise<ApiResponse<any>> {
        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.id = :userId', { userId })
            .addSelect('user.password')
            .getOne();

        if (!user) {
            throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Người dùng không tồn tại');
        }

        const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
        if (!isMatch) {
            throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PASSWORD', 'Mật khẩu cũ không chính xác');
        }

        user.password = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepository.save(user);

        return new ApiResponse(true, 'Đổi mật khẩu thành công', null);
    }

    // Get user inventory by userId
    async getUserInventory(userId: string): Promise<ApiResponse<any>> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Người dùng không tồn tại');
        }

        const items = await this.inventoryRepo.find({ where: { userId } });
        
        const result = items.map(i => {
            const def = ITEM_DEFINITIONS[i.itemType];
            return {
                id: i.id,
                itemType: i.itemType,
                name: def?.name,
                emoji: def?.emoji,
                quantity: i.quantity,
            };
        });

        return new ApiResponse(true, 'Lấy kho đồ người dùng thành công', result);
    }

    // Update user inventory
    async updateUserInventory(userId: string, itemType: EItemType, amount: number, action: EUpdateInventoryAction): Promise<ApiResponse<any>> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Người dùng không tồn tại');
        }

        const def = ITEM_DEFINITIONS[itemType];
        if (!def) {
            throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_ITEM', 'Vật phẩm không hợp lệ');
        }

        let inv = await this.inventoryRepo.findOne({ where: { userId, itemType } });
        let newQuantity = 0;

        if (action === EUpdateInventoryAction.SET) {
            newQuantity = amount;
        } else if (action === EUpdateInventoryAction.ADD) {
            newQuantity = (inv ? inv.quantity : 0) + amount;
        }

        if (newQuantity <= 0) {
            if (inv) {
                await this.inventoryRepo.remove(inv);
            }
        } else {
            if (inv) {
                inv.quantity = newQuantity;
                await this.inventoryRepo.save(inv);
            } else {
                inv = this.inventoryRepo.create({ userId, itemType, quantity: newQuantity });
                await this.inventoryRepo.save(inv);
            }
        }

        return new ApiResponse(true, 'Cập nhật kho đồ thành công', null);
    }
}