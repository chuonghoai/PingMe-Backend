import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntimacyRelationship } from './entities/intimacy-relationship.entity';
import { DailyIntimacyStat } from './entities/daily-intimacy-stat.entity';
import { IntimacyEvent, EIntimacyEventType } from './entities/intimacy-event.entity';
import { WebsocketsService } from '../websockets/websockets.service';
import { UsersService } from '../users/users.service';
import { ChallengesService } from '../challenges/challenges.service';
import { NotificationsService } from '../notifications/notifications.service';

const DAILY_CAP = 150;

@Injectable()
export class IntimacyService {
  private readonly logger = new Logger(IntimacyService.name);
  
  private readonly proximityCooldowns: Map<string, number> = new Map();

  constructor(
    @InjectRepository(IntimacyRelationship)
    private readonly relationshipRepo: Repository<IntimacyRelationship>,
    @InjectRepository(DailyIntimacyStat)
    private readonly dailyStatRepo: Repository<DailyIntimacyStat>,
    @InjectRepository(IntimacyEvent)
    private readonly eventRepo: Repository<IntimacyEvent>,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChallengesService))
    private readonly challengesService: ChallengesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Sort user IDs to prevent bidirectional duplicates (userA-userB vs userB-userA)
   */
  private sortIds(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  /**
   * Calculate required Exp for a specific level.
   * Formula: Exp = 100 * (Level ^ 1.5)
   */
  getRequiredExp(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Compute level based on total Exp
   */
  computeLevel(totalExp: number): number {
    if (totalExp < 100) return 1;
    const rawLevel = Math.pow(totalExp / 100, 1 / 1.5);
    return Math.floor(rawLevel);
  }

  /**
   * Get basic score for event type
   */
  private getEventScore(eventType: EIntimacyEventType): number {
    switch (eventType) {
      case EIntimacyEventType.CHAT: return 1;
      case EIntimacyEventType.REACTION: return 2;
      case EIntimacyEventType.LOCATION: return 5;
      case EIntimacyEventType.PROXIMITY: return 5;
      case EIntimacyEventType.CALL: return 5;
      case EIntimacyEventType.GIFT: return 10;
      default: return 0;
    }
  }

  /**
   * Process a new interaction event between two users
   */
  async processInteraction(u1: string, u2: string, eventType: EIntimacyEventType, customScoreDelta?: number): Promise<number> {
    try {
      const [user1Id, user2Id] = this.sortIds(u1, u2);
      
      if (eventType === EIntimacyEventType.PROXIMITY) {
        const key = `${user1Id}_${user2Id}`;
        const lastProximityAt = this.proximityCooldowns.get(key);
        const now = Date.now();
        if (lastProximityAt && (now - lastProximityAt < 5 * 60 * 1000)) {
          return 0;
        }
        this.proximityCooldowns.set(key, now);
      }

      let rel = await this.relationshipRepo.findOne({ where: { user1Id, user2Id } });
      if (!rel) {
        rel = this.relationshipRepo.create({ user1Id, user2Id, totalIntimacyScore: 0, level: 1 });
        await this.relationshipRepo.save(rel);
      }

      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      let dailyStat = await this.dailyStatRepo.findOne({ where: { relationshipId: rel.id, dateString } });
      if (!dailyStat) {
        dailyStat = this.dailyStatRepo.create({ relationshipId: rel.id, dateString });
        await this.dailyStatRepo.save(dailyStat);
        
        await this.updateStreak(rel, today);
      }

      if (eventType !== EIntimacyEventType.GIFT && dailyStat.pointsGained >= DAILY_CAP) {
        await this.logEvent(rel.id, eventType, 0);
        return 0;
      }

      let scoreDelta = customScoreDelta !== undefined ? customScoreDelta : this.getEventScore(eventType);
      
      const hasBoostU1 = await this.challengesService.hasActiveExpBoost(u1);
      const hasBoostU2 = await this.challengesService.hasActiveExpBoost(u2);
      if (hasBoostU1 || hasBoostU2) {
        scoreDelta = scoreDelta * 2;
        this.logger.log(`EXP BOOST active! Score doubled: ${scoreDelta / 2} → ${scoreDelta}`);
      }

      if (rel.currentStreak >= 30) scoreDelta = Math.floor(scoreDelta * 1.5);
      else if (rel.currentStreak >= 7) scoreDelta = Math.floor(scoreDelta * 1.2);
      else if (rel.currentStreak >= 3) scoreDelta = Math.floor(scoreDelta * 1.1);
      
      if (scoreDelta === 0 && (customScoreDelta !== undefined ? customScoreDelta > 0 : this.getEventScore(eventType) > 0)) scoreDelta = 1;

      if (eventType !== EIntimacyEventType.GIFT) {
        if (dailyStat.pointsGained + scoreDelta > DAILY_CAP) {
          scoreDelta = DAILY_CAP - dailyStat.pointsGained;
        }
        dailyStat.pointsGained += scoreDelta;
      }

      if (eventType === EIntimacyEventType.CHAT) dailyStat.messagesCount += 1;
      
      rel.totalIntimacyScore += scoreDelta;
      rel.lastInteractionAt = new Date();
      
      const newLevel = this.computeLevel(rel.totalIntimacyScore);
      let levelUp = false;
      if (newLevel > rel.level) {
        rel.level = newLevel;
        levelUp = true;
      }

      await this.dailyStatRepo.save(dailyStat);
      await this.relationshipRepo.save(rel);
      await this.logEvent(rel.id, eventType, scoreDelta);

      try {
        const triggerMap: Record<string, string> = {
          [EIntimacyEventType.CHAT]: 'CHAT',
          [EIntimacyEventType.CALL]: 'CALL',
          [EIntimacyEventType.PROXIMITY]: 'PROXIMITY',
        };
        const trigger = triggerMap[eventType];
        if (trigger) {
          await this.challengesService.updateProgress(u1, trigger);
          if (eventType === EIntimacyEventType.PROXIMITY || eventType === EIntimacyEventType.CALL) {
            await this.challengesService.updateProgress(u2, trigger);
          }
        }

        await this.challengesService.updateStreakChallenges(u1, rel.currentStreak);
        await this.challengesService.updateStreakChallenges(u2, rel.currentStreak);

        if (levelUp) {
          await this.challengesService.updateLevelChallenges(u1, rel.level);
          await this.challengesService.updateLevelChallenges(u2, rel.level);
        }
      } catch (e) {
        this.logger.error('Error updating challenge progress from intimacy', e);
      }

      if (levelUp) {
        this.logger.log(`LEVEL UP! Relationship ${rel.id} reached level ${rel.level}`);
        this.websocketsService.emitToUsers([user1Id, user2Id], 'intimacy_level_up', {
          friendId1: user1Id,
          friendId2: user2Id,
          newLevel: rel.level
        });

        const u1Entity = await this.usersService.findById(u1);
        const u2Entity = await this.usersService.findById(u2);
        if (u1Entity && u2Entity) {
          this.notificationsService.createIntimacyLevelUpNotification(
            u1, u2, u2Entity.fullname, rel.level
          ).catch(e => console.log('Intimacy notification error', e));
          
          this.notificationsService.createIntimacyLevelUpNotification(
            u2, u1, u1Entity.fullname, rel.level
          ).catch(e => console.log('Intimacy notification error', e));
        }
      }

      return scoreDelta;
    } catch (error) {
      this.logger.error(`Error processing intimacy interaction`, error);
      return 0;
    }
  }

  private async updateStreak(rel: IntimacyRelationship, today: Date) {
    if (!rel.lastInteractionAt) {
      rel.currentStreak = 1;
      rel.longestStreak = 1;
      return;
    }

    const lastInteraction = new Date(rel.lastInteractionAt);
    lastInteraction.setHours(0, 0, 0, 0);
    
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(todayMidnight.getTime() - lastInteraction.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays === 1) {
      rel.currentStreak += 1;
      if (rel.currentStreak > rel.longestStreak) {
        rel.longestStreak = rel.currentStreak;
      }
    } else if (diffDays > 1) {
      const shieldUsed = await this.challengesService.checkAndApplyStreakShield(rel.user1Id, rel.user2Id);
      if (shieldUsed) {
        rel.currentStreak += 1;
        if (rel.currentStreak > rel.longestStreak) {
          rel.longestStreak = rel.currentStreak;
        }
        this.logger.log(`Streak PROTECTED by shield for ${rel.user1Id} <-> ${rel.user2Id}`);
      } else {
        rel.currentStreak = 1;
      }
    }
  }

  private async logEvent(relationshipId: string, eventType: EIntimacyEventType, scoreDelta: number) {
    const event = this.eventRepo.create({ relationshipId, eventType, scoreDelta });
    await this.eventRepo.save(event);
  }

  /**
   * Get Intimacy information between two users
   */
  async getIntimacyInfo(u1: string, u2: string) {
    const [user1Id, user2Id] = this.sortIds(u1, u2);
    
    let rel = await this.relationshipRepo.findOne({ where: { user1Id, user2Id } });
    if (!rel) {
      return {
        level: 1,
        totalIntimacyScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        nextLevelExp: this.getRequiredExp(2),
        auraUnlocked: 'NONE'
      };
    }

    let aura = 'NONE';
    if (rel.level >= 50) aura = 'DIAMOND';
    else if (rel.level >= 20) aura = 'PLATINUM';
    else if (rel.level >= 10) aura = 'GOLD';
    else if (rel.level >= 5) aura = 'SILVER';

    return {
      level: rel.level,
      totalIntimacyScore: rel.totalIntimacyScore,
      currentStreak: rel.currentStreak,
      longestStreak: rel.longestStreak,
      nextLevelExp: this.getRequiredExp(rel.level + 1),
      auraUnlocked: aura
    };
  }
}
