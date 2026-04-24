/* eslint-disable prettier/prettier */

// ── Challenge Types ──
export enum EChallengeType {
  CHAT_10 = 'CHAT_10',
  STREAK_3 = 'STREAK_3',
  STREAK_7 = 'STREAK_7',
  CALL_1 = 'CALL_1',
  PROXIMITY_3 = 'PROXIMITY_3',
  GIFT_SEND_3 = 'GIFT_SEND_3',
  LEVEL_UP_5 = 'LEVEL_UP_5',
}

// ── Item Types ──
export enum EItemType {
  ROSE = 'ROSE',
  ROCKET = 'ROCKET',
  STAR = 'STAR',
  STREAK_SHIELD = 'STREAK_SHIELD',
  EXP_BOOST = 'EXP_BOOST',
}

// ── Item Category ──
export enum EItemCategory {
  GIFT = 'GIFT',
  SPECIAL = 'SPECIAL',
}

// ── Effect Types (for active_effects) ──
export enum EEffectType {
  STREAK_SHIELD = 'STREAK_SHIELD',
  EXP_BOOST = 'EXP_BOOST',
}

// ── Challenge Definition Map ──
export interface ChallengeDefinition {
  type: EChallengeType;
  name: string;
  description: string;
  emoji: string;
  targetProgress: number;
  rewardItem: EItemType;
  rewardQuantity: number;
  triggerEvent: string;
}

export const CHALLENGE_DEFINITIONS: Record<EChallengeType, ChallengeDefinition> = {
  [EChallengeType.CHAT_10]: {
    type: EChallengeType.CHAT_10,
    name: 'Trò chuyện sôi nổi',
    description: 'Gửi 10 tin nhắn cho bạn bè',
    emoji: '💬',
    targetProgress: 10,
    rewardItem: EItemType.ROSE,
    rewardQuantity: 1,
    triggerEvent: 'CHAT',
  },
  [EChallengeType.STREAK_3]: {
    type: EChallengeType.STREAK_3,
    name: 'Bạn bè kiên trì',
    description: 'Duy trì streak 3 ngày liên tiếp',
    emoji: '🔥',
    targetProgress: 3,
    rewardItem: EItemType.ROCKET,
    rewardQuantity: 1,
    triggerEvent: 'STREAK',
  },
  [EChallengeType.STREAK_7]: {
    type: EChallengeType.STREAK_7,
    name: 'Tuần lễ tri kỷ',
    description: 'Duy trì streak 7 ngày liên tiếp',
    emoji: '🔥',
    targetProgress: 7,
    rewardItem: EItemType.STREAK_SHIELD,
    rewardQuantity: 1,
    triggerEvent: 'STREAK',
  },
  [EChallengeType.CALL_1]: {
    type: EChallengeType.CALL_1,
    name: 'Cuộc gọi đầu tiên',
    description: 'Gọi điện cho bạn bè',
    emoji: '📞',
    targetProgress: 1,
    rewardItem: EItemType.STAR,
    rewardQuantity: 1,
    triggerEvent: 'CALL',
  },
  [EChallengeType.PROXIMITY_3]: {
    type: EChallengeType.PROXIMITY_3,
    name: 'Gặp nhau ngoài đời',
    description: 'Ở gần bạn bè 3 lần',
    emoji: '🤝',
    targetProgress: 3,
    rewardItem: EItemType.ROCKET,
    rewardQuantity: 1,
    triggerEvent: 'PROXIMITY',
  },
  [EChallengeType.GIFT_SEND_3]: {
    type: EChallengeType.GIFT_SEND_3,
    name: 'Người hào phóng',
    description: 'Gửi 3 món quà cho bạn bè',
    emoji: '🎁',
    targetProgress: 3,
    rewardItem: EItemType.EXP_BOOST,
    rewardQuantity: 1,
    triggerEvent: 'GIFT_SENT',
  },
  [EChallengeType.LEVEL_UP_5]: {
    type: EChallengeType.LEVEL_UP_5,
    name: 'Tình bạn nở hoa',
    description: 'Đạt level 5 thân mật với bạn bè',
    emoji: '💛',
    targetProgress: 5,
    rewardItem: EItemType.ROSE,
    rewardQuantity: 3,
    triggerEvent: 'LEVEL',
  },
};

// ── Item Definition Map ──
export interface ItemDefinition {
  type: EItemType;
  name: string;
  emoji: string;
  category: EItemCategory;
  intimacyBonus: number;
  description: string;
}

export const ITEM_DEFINITIONS: Record<EItemType, ItemDefinition> = {
  [EItemType.ROSE]: {
    type: EItemType.ROSE,
    name: 'Hoa hồng',
    emoji: '🌹',
    category: EItemCategory.GIFT,
    intimacyBonus: 15,
    description: 'Tặng bạn bè để tăng 15 điểm thân mật',
  },
  [EItemType.ROCKET]: {
    type: EItemType.ROCKET,
    name: 'Tên lửa',
    emoji: '🚀',
    category: EItemCategory.GIFT,
    intimacyBonus: 25,
    description: 'Tặng bạn bè để tăng 25 điểm thân mật',
  },
  [EItemType.STAR]: {
    type: EItemType.STAR,
    name: 'Ngôi sao',
    emoji: '⭐',
    category: EItemCategory.GIFT,
    intimacyBonus: 40,
    description: 'Tặng bạn bè để tăng 40 điểm thân mật',
  },
  [EItemType.STREAK_SHIELD]: {
    type: EItemType.STREAK_SHIELD,
    name: 'Khiên bảo vệ streak',
    emoji: '🛡️',
    category: EItemCategory.SPECIAL,
    intimacyBonus: 0,
    description: 'Bảo vệ streak không bị mất khi bỏ lỡ 1 ngày',
  },
  [EItemType.EXP_BOOST]: {
    type: EItemType.EXP_BOOST,
    name: 'x2 EXP 1 giờ',
    emoji: '⚡',
    category: EItemCategory.SPECIAL,
    intimacyBonus: 0,
    description: 'Nhân đôi điểm thân mật nhận được trong 60 phút',
  },
};
