// badges/BadgeDefinitions.js
export const badgeDefinitions = [
  {
    id: 1,
    name: 'スタートバッジ 🐣',
    description: '最初の正解を達成した証',
    condition: (stats) => stats.totalCorrect >= 1,
    imagePath: require('../assets/badge_1.png'),
  },
  {
    id: 2,
    name: '連続正解バッジ 🔥',
    description: '5問連続正解を達成',
    condition: (stats) => stats.maxStreak >= 5,
    imagePath: require('../assets/badge_2.png'),
  },
  {
    id: 3,
    name: '学習の達人 📚',
    description: '1日に20問以上解いた',
    condition: (stats) => stats.dailyProblemCount >= 20,
    imagePath: require('../assets/badge_3.png'),
  },
  {
    id: 4,
    name: 'ミスゼロバッジ 💎',
    description: '1回のセッションで全問正解',
    condition: (stats) => stats.sessionAccuracy === 100,
    imagePath: require('../assets/badge_4.png'),
  },
  {
    id: 5,
    name: '継続バッジ 🕒',
    description: '3日連続で利用',
    condition: (stats) => stats.lastNDays.length >= 3,
    imagePath: require('../assets/badge_5.png'),
  },
  {
    id: 6,
    name: '難問突破バッジ 🐉',
    description: '難問（レベル7）に正解した回数1回以上',
    condition: (stats) => stats.hardQuestionCorrect >= 1,
    imagePath: require('../assets/badge_6.png'),
  },
  {
    id: 7,
    name: '復習マスター 🧠',
    description: '間違った問題を再挑戦して正解',
    condition: (stats) => stats.retryCorrect >= 1,
    imagePath: require('../assets/badge_7.png'),
  },
  {
    id: 8,
    name: '目標達成バッジ 🎯',
    description: '累計スコア100点以上',
    condition: (stats) => stats.totalScore >= 100,
    imagePath: require('../assets/badge_8.png'),
  },
  {
    id: 9,
    name: '王者の証 👑',
    description: '他の8個すべてを獲得',
    condition: (stats) => stats.earnedBadgeCount >= 8,
    imagePath: require('../assets/badge_9.png'),
  },
];

// バッジ獲得状況をチェック
export const checkBadges = async (stats) => {
  const badges = badgeDefinitions.map(badge => {
    const earned = badge.condition(stats);
    const earnedCount = stats.badgeEarnCounts?.[badge.id] || (earned ? 1 : 0);
    return {
      ...badge,
      earned,
      earnedCount,
    };
  });
  
  // バッジ獲得数を更新（王者の証のため）
  const earnedCount = badges.filter(b => b.earned && b.id !== 9).length;
  stats.earnedBadgeCount = earnedCount;
  
  return badges;
};

// 新しく獲得したバッジのみを返す
export const getNewlyEarnedBadges = async (currentStats, previousStats = null) => {
  const currentBadges = await checkBadges(currentStats);
  
  if (!previousStats) {
    // 以前の統計がない場合、獲得済みのすべてのバッジを新規とみなす
    return currentBadges.filter(badge => badge.earned);
  }
  
  const previousBadges = await checkBadges(previousStats);
  const newBadges = [];
  
  for (let i = 0; i < currentBadges.length; i++) {
    if (currentBadges[i].earned && !previousBadges[i].earned) {
      newBadges.push(currentBadges[i]);
    }
  }
  
  return newBadges;
};

// 獲得済みバッジの数を計算
export const countEarnedBadges = (badges) => {
  return badges.filter(badge => badge.earned).length;
};
