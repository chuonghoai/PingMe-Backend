import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { UserRepository } from "./users.repository";
import { EUserActivityType, EUserGender, EUserRole, EUserStatus } from "./enums/user.enum";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService implements OnModuleInit {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly userRepository: UserRepository,
    ) { }

    async onModuleInit() {
        await this.seedDefaultAdmin();
    }

    private async seedDefaultAdmin() {
        const adminEmail = 'manggia098@gmail.com';
        const existingAdmin = await this.userRepository.findByEmail(adminEmail);

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('Admin@123456', 10);

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
                level: 99,
                currentExp: 9999,
            });

            await this.userRepository.save(adminUser);
            this.logger.log(`Đã tạo tài khoản Admin mặc định: ${adminEmail} | Mật khẩu: Admin@123456`);
        } else {
            this.logger.log('Tài khoản Admin đã tồn tại, bỏ qua bước khởi tạo.');
        }
    }
}