import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moment } from './entities/moment.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { MomentReport } from './entities/moment-report.entity';

@Injectable()
export class MomentsAdminService {
    constructor(
        @InjectRepository(Moment) private readonly momentRepo: Repository<Moment>,
        @InjectRepository(MomentReport) private readonly reportRepo: Repository<MomentReport>,
    ) { }

    // Get list all moments
    async getAllMoments(page: number, limit: number): Promise<ApiResponse<any>> {
        const [moments, total] = await this.momentRepo.createQueryBuilder('moment')
            .leftJoinAndSelect('moment.user', 'user')
            .loadRelationCountAndMap('moment.reportCount', 'moment.reports')
            .orderBy('moment.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const data = moments.map((m: any) => ({
            id: m.id,
            imageUrl: m.imageUrl,
            caption: m.caption,
            createdAt: m.createdAt,
            user: {
                id: m.user?.id,
                fullname: m.user?.fullname,
                avatarUrl: m.user?.avatarUrl
            },
            reportCount: m.reportCount || 0,
            isReported: (m.reportCount || 0) > 0,
        }));

        return new ApiResponse(true, 'Lấy danh sách thành công', { moments: data, total, page, limit });
    }

    // Get list moment is reported
    async getReportedMoments(page: number, limit: number): Promise<ApiResponse<any>> {
        const qb = this.momentRepo.createQueryBuilder('moment')
            .innerJoin('moment.reports', 'report', 'report.isHandled = false')
            .leftJoinAndSelect('moment.user', 'user')
            .loadRelationCountAndMap('moment.reportCount', 'moment.reports', 'reportCount', qb => qb.where('reportCount.isHandled = false'))
            .orderBy('moment.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [moments, total] = await qb.getManyAndCount();

        const data = moments.map((m: any) => ({
            id: m.id,
            imageUrl: m.imageUrl,
            caption: m.caption,
            createdAt: m.createdAt,
            user: {
                id: m.user?.id,
                fullname: m.user?.fullname,
                avatarUrl: m.user?.avatarUrl
            },
            unhandledReportCount: m.reportCount || 0,
        }));

        return new ApiResponse(true, 'Lấy danh sách bị báo cáo thành công', { moments: data, total, page, limit });
    }

    // Get detail moment is reported
    async getReportedMomentDetail(momentId: string): Promise<ApiResponse<any>> {
        const moment = await this.momentRepo.findOne({
            where: { id: momentId },
            relations: ['user', 'reports', 'reports.reporter'],
        });

        if (!moment) throw new NotFoundException('Không tìm thấy khoảnh khắc');

        const detail = {
            momentInfo: {
                id: moment.id,
                imageUrl: moment.imageUrl,
                caption: moment.caption,
                createdAt: moment.createdAt,
                user: {
                    id: moment.user?.id,
                    fullname: moment.user?.fullname,
                    avatarUrl: moment.user?.avatarUrl
                },
            },
            reports: moment.reports.map(r => ({
                id: r.id,
                reason: r.reason,
                description: r.description,
                isHandled: r.isHandled,
                createdAt: r.createdAt,
                reporter: {
                    id: r.reporter?.id,
                    fullname: r.reporter?.fullname,
                    avatarUrl: r.reporter?.avatarUrl
                }
            })),
        };

        return new ApiResponse(true, 'Chi tiết báo cáo', detail);
    }

    // Remove moment
    async deleteReportedMoment(momentId: string): Promise<ApiResponse<any>> {
        await this.reportRepo.update({ momentId }, { isHandled: true });

        const moment = await this.momentRepo.findOne({ where: { id: momentId } });
        if (moment) {
            await this.momentRepo.remove(moment);
        }

        return new ApiResponse(true, 'Đã xóa Moment và đánh dấu xử lý các báo cáo', null);
    }
}