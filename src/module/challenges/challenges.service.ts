/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserChallenge } from './entities/user-challenge.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { ActiveEffect } from './entities/active-effect.entity';
import {
  EChallengeType, EItemType, EItemCategory, EEffectType,
  CHALLENGE_DEFINITIONS, ITEM_DEFINITIONS,
  ChallengeDefinition, ItemDefinition,
} from './entities/challenge-definition';
import { WebsocketsService } from '../websockets/websockets.service';
import { IntimacyService } from '../intimacy/intimacy.service';
import { EIntimacyEventType } from '../intimacy/entities/intimacy-event.entity';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    @InjectRepository(UserChallenge)
    private readonly challengeRepo: Repository<UserChallenge>,
    @InjectRepository(UserInventory)
    private readonly inventoryRepo: Repository<UserInventory>,
    @InjectRepository(ActiveEffect)
    private readonly effectRepo: Repository<ActiveEffect>,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService,
    @Inject(forwardRef(() => IntimacyService))
    private readonly intimacyService: IntimacyService,
  ) { }

  // ── Initialize challenges for a user ──
  async initChallengesForUser(userId: string): Promise<void> {
    const allTypes = Object.values(EChallengeType);

    for (const type of allTypes) {
      const existing = await this.challengeRepo.findOne({
        where: { userId, challengeType: type },
      });

      if (!existing) {
        const def = CHALLENGE_DEFINITIONS[type];
        const challenge = this.challengeRepo.create({
          userId,
          challengeType: type,
          currentProgress: 0,
          targetProgress: def.targetProgress,
          isCompleted: false,
          isClaimed: false,
        });
        await this.challengeRepo.save(challenge);
      }
    }
  }

  // ── Update challenge progress based on event ──
  async updateProgress(userId: string, triggerEvent: string, incrementBy: number = 1): Promise<void> {
    try {
      const challenges = await this.challengeRepo.find({
        where: { userId, isClaimed: false },
      });

      for (const challenge of challenges) {
        const def = CHALLENGE_DEFINITIONS[challenge.challengeType];
        if (!def || def.triggerEvent !== triggerEvent) continue;
        if (challenge.isCompleted) continue;

        if (triggerEvent === 'STREAK') {
          challenge.currentProgress = Math.max(challenge.currentProgress, incrementBy);
        } else if (triggerEvent === 'LEVEL') {
          challenge.currentProgress = Math.max(challenge.currentProgress, incrementBy);
        } else {
          challenge.currentProgress += incrementBy;
        }

        if (challenge.currentProgress >= challenge.targetProgress) {
          challenge.isCompleted = true;
          challenge.completedAt = new Date();

          this.websocketsService.emitToUsers([userId], 'challenge_completed', {
            challengeType: challenge.challengeType,
            name: def.name,
            emoji: def.emoji,
            rewardItem: def.rewardItem,
            rewardQuantity: def.rewardQuantity,
          });
        }

        await this.challengeRepo.save(challenge);
      }
    } catch (error) {
      this.logger.error('Error updating challenge progress', error);
    }
  }

  // ── Update streak-based challenges ──
  async updateStreakChallenges(userId: string, currentStreak: number): Promise<void> {
    await this.updateProgress(userId, 'STREAK', currentStreak);
  }

  // ── Update level-based challenges ──
  async updateLevelChallenges(userId: string, currentLevel: number): Promise<void> {
    await this.updateProgress(userId, 'LEVEL', currentLevel);
  }

  // ── Claim challenge reward ──
  async claimReward(userId: string, challengeId: string) {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId, userId },
    });

    if (!challenge) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy thử thách');
    }
    if (!challenge.isCompleted) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'NOT_COMPLETED', 'Thử thách chưa hoàn thành');
    }
    if (challenge.isClaimed) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'ALREADY_CLAIMED', 'Phần thưởng đã được nhận');
    }

    const def = CHALLENGE_DEFINITIONS[challenge.challengeType];

    await this.addToInventory(userId, def.rewardItem, def.rewardQuantity);

    challenge.isClaimed = true;
    await this.challengeRepo.save(challenge);

    const itemDef = ITEM_DEFINITIONS[def.rewardItem];

    return {
      challengeType: challenge.challengeType,
      rewardItem: def.rewardItem,
      rewardQuantity: def.rewardQuantity,
      itemName: itemDef.name,
      itemEmoji: itemDef.emoji,
    };
  }

  // ── Add item to inventory ──
  async addToInventory(userId: string, itemType: EItemType, quantity: number): Promise<void> {
    let inv = await this.inventoryRepo.findOne({
      where: { userId, itemType },
    });

    if (inv) {
      inv.quantity += quantity;
    } else {
      inv = this.inventoryRepo.create({ userId, itemType, quantity });
    }

    await this.inventoryRepo.save(inv);
  }

  // ── Get active challenges for user ──
  async getActiveChallenges(userId: string) {
    await this.initChallengesForUser(userId);

    const challenges = await this.challengeRepo.find({
      where: { userId },
      order: { isCompleted: 'DESC', createdAt: 'ASC' },
    });

    return challenges.map(c => {
      const def = CHALLENGE_DEFINITIONS[c.challengeType];
      const itemDef = ITEM_DEFINITIONS[def.rewardItem];
      return {
        id: c.id,
        challengeType: c.challengeType,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        currentProgress: c.currentProgress,
        targetProgress: c.targetProgress,
        isCompleted: c.isCompleted,
        isClaimed: c.isClaimed,
        completedAt: c.completedAt,
        reward: {
          itemType: def.rewardItem,
          itemName: itemDef.name,
          itemEmoji: itemDef.emoji,
          quantity: def.rewardQuantity,
        },
      };
    });
  }

  // ── Get user inventory ──
  async getInventory(userId: string) {
    const items = await this.inventoryRepo.find({
      where: { userId },
    });

    return items
      .filter(i => i.quantity > 0)
      .map(i => {
        const def = ITEM_DEFINITIONS[i.itemType];
        return {
          itemType: i.itemType,
          name: def.name,
          emoji: def.emoji,
          category: def.category,
          quantity: i.quantity,
          description: def.description,
          intimacyBonus: def.intimacyBonus,
        };
      });
  }

  // ── Send gift to friend ──
  async sendGift(senderId: string, receiverId: string, itemType: EItemType) {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def || def.category !== EItemCategory.GIFT) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_ITEM', 'Vật phẩm không hợp lệ để tặng');
    }

    const inv = await this.inventoryRepo.findOne({
      where: { userId: senderId, itemType },
    });

    if (!inv || inv.quantity <= 0) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INSUFFICIENT_ITEMS', 'Bạn không có vật phẩm này trong kho');
    }

    inv.quantity -= 1;
    await this.inventoryRepo.save(inv);

    const actualGained = await this.intimacyService.processInteraction(senderId, receiverId, EIntimacyEventType.GIFT, def.intimacyBonus);

    await this.updateProgress(senderId, 'GIFT_SENT');

    this.websocketsService.emitToUsers([senderId, receiverId], 'receive_gift', {
      senderId,
      receiverId,
      itemType,
      itemName: def.name,
      itemEmoji: def.emoji,
      intimacyGained: actualGained,
    });

    return {
      success: true,
      itemType,
      itemName: def.name,
      intimacyGained: actualGained,
      remainingQuantity: inv.quantity,
    };
  }

  // ── Use special item ──
  async useSpecialItem(userId: string, itemType: EItemType, friendId?: string) {
    const def = ITEM_DEFINITIONS[itemType];
    if (!def || def.category !== EItemCategory.SPECIAL) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_ITEM', 'Vật phẩm không hợp lệ');
    }

    const inv = await this.inventoryRepo.findOne({
      where: { userId, itemType },
    });

    if (!inv || inv.quantity <= 0) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INSUFFICIENT_ITEMS', 'Bạn không có vật phẩm này');
    }

    inv.quantity -= 1;
    await this.inventoryRepo.save(inv);

    let expiresAt: Date;
    if (itemType === EItemType.STREAK_SHIELD) {
      expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else if (itemType === EItemType.EXP_BOOST) {
      expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    } else {
      expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    const effect = this.effectRepo.create({
      userId,
      friendId: friendId || undefined,
      effectType: itemType as unknown as EEffectType,
      expiresAt,
    });
    await this.effectRepo.save(effect);

    this.websocketsService.emitToUsers([userId], 'effect_activated', {
      effectType: itemType,
      itemName: def.name,
      itemEmoji: def.emoji,
      expiresAt,
    });

    return {
      success: true,
      effectType: itemType,
      itemName: def.name,
      expiresAt,
      remainingQuantity: inv.quantity,
    };
  }

  // ── Check if user has active EXP boost ──
  async hasActiveExpBoost(userId: string): Promise<boolean> {
    const effect = await this.effectRepo.findOne({
      where: {
        userId,
        effectType: EEffectType.EXP_BOOST,
        expiresAt: MoreThan(new Date()),
      },
    });
    return !!effect;
  }

  // ── Check & apply streak shield ──
  async checkAndApplyStreakShield(user1Id: string, user2Id: string): Promise<boolean> {
    const shield1 = await this.effectRepo.findOne({
      where: {
        userId: user1Id,
        effectType: EEffectType.STREAK_SHIELD,
        expiresAt: MoreThan(new Date()),
      },
    });

    const shield2 = await this.effectRepo.findOne({
      where: {
        userId: user2Id,
        effectType: EEffectType.STREAK_SHIELD,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (shield1) {
      await this.effectRepo.remove(shield1);
      this.websocketsService.emitToUsers([user1Id, user2Id], 'streak_shield_used', {
        protectedBy: user1Id,
      });
      this.logger.log(`Streak shield used by ${user1Id} to protect streak with ${user2Id}`);
      return true;
    }

    if (shield2) {
      await this.effectRepo.remove(shield2);
      this.websocketsService.emitToUsers([user1Id, user2Id], 'streak_shield_used', {
        protectedBy: user2Id,
      });
      this.logger.log(`Streak shield used by ${user2Id} to protect streak with ${user1Id}`);
      return true;
    }

    return false;
  }

  // ── Get all item definitions (for frontend catalog) ──
  getAllItemDefinitions() {
    return Object.values(ITEM_DEFINITIONS);
  }

  getAllChallengeDefinitions() {
    return Object.values(CHALLENGE_DEFINITIONS);
  }
}
