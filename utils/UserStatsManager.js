// utils/UserStatsManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'kanjiapp_user_stats';
const DAILY_ACTIVITY_KEY = 'kanjiapp_daily_activity';

// デフォルトの統計情報
const defaultStats = {
  totalCorrect: 0,
  maxStreak: 0,
  currentStreak: 0,
  dailyProblemCount: 0,
  sessionAccuracy: 0,
  lastNDays: [],
  hardQuestionCorrect: 0,
  retryCorrect: 0,
  totalScore: 0,
  earnedBadgeCount: 0,
  sessionsCompleted: 0,
  totalAttempts: 0,
  badgeEarnCounts: {}, // バッジ獲得回数を追跡
};

// 統計情報を読み込み
export const loadUserStats = async () => {
  try {
    const statsJson = await AsyncStorage.getItem(STATS_KEY);
    if (statsJson) {
      return { ...defaultStats, ...JSON.parse(statsJson) };
    }
    return defaultStats;
  } catch (error) {
    console.error('統計情報読み込みエラー:', error);
    return defaultStats;
  }
};

// 統計情報を保存
export const saveUserStats = async (stats) => {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('統計情報保存エラー:', error);
  }
};

// 今日の日付文字列を取得
const getTodayString = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

// 日次活動を記録
export const recordDailyActivity = async () => {
  try {
    const today = getTodayString();
    const activityJson = await AsyncStorage.getItem(DAILY_ACTIVITY_KEY);
    let activity = activityJson ? JSON.parse(activityJson) : {};
    
    if (!activity[today]) {
      activity[today] = 0;
    }
    activity[today]++;
    
    await AsyncStorage.setItem(DAILY_ACTIVITY_KEY, JSON.stringify(activity));
    return activity[today];
  } catch (error) {
    console.error('日次活動記録エラー:', error);
    return 0;
  }
};

// 連続日数を計算
export const calculateConsecutiveDays = async () => {
  try {
    const activityJson = await AsyncStorage.getItem(DAILY_ACTIVITY_KEY);
    if (!activityJson) return [];
    
    const activity = JSON.parse(activityJson);
    const today = new Date();
    const consecutiveDays = [];
    
    for (let i = 0; i < 30; i++) { // 過去30日まで確認
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      if (activity[dateString] && activity[dateString] > 0) {
        consecutiveDays.unshift(dateString);
      } else if (i === 0) {
        // 今日活動していない場合は連続記録なし
        break;
      } else {
        // 連続が途切れた
        break;
      }
    }
    
    return consecutiveDays;
  } catch (error) {
    console.error('連続日数計算エラー:', error);
    return [];
  }
};

// 今日の問題数を取得
export const getTodayProblemCount = async () => {
  try {
    const activityJson = await AsyncStorage.getItem(DAILY_ACTIVITY_KEY);
    if (!activityJson) return 0;
    
    const activity = JSON.parse(activityJson);
    const today = getTodayString();
    return activity[today] || 0;
  } catch (error) {
    console.error('今日の問題数取得エラー:', error);
    return 0;
  }
};

// 統計情報を更新
export const updateUserStats = async (updates) => {
  try {
    const currentStats = await loadUserStats();
    const newStats = { ...currentStats, ...updates };
    
    // 連続日数の更新
    const consecutiveDays = await calculateConsecutiveDays();
    newStats.lastNDays = consecutiveDays;
    
    // 今日の問題数の更新
    newStats.dailyProblemCount = await getTodayProblemCount();
    
    await saveUserStats(newStats);
    return newStats;
  } catch (error) {
    console.error('統計情報更新エラー:', error);
    return await loadUserStats();
  }
};

// セッション結果を記録
export const recordSessionResult = async (sessionData) => {
  const { correct, total, streak, scoreGained } = sessionData;
  
  // 日次活動を記録
  await recordDailyActivity();
  
  const currentStats = await loadUserStats();
  
  // 統計情報の更新
  const updates = {
    totalCorrect: currentStats.totalCorrect + correct,
    totalAttempts: currentStats.totalAttempts + total,
    totalScore: currentStats.totalScore + scoreGained,
    sessionsCompleted: currentStats.sessionsCompleted + 1,
    sessionAccuracy: total > 0 ? (correct / total) * 100 : 0,
  };
  
  // 最高ストリークの更新
  if (streak > currentStats.maxStreak) {
    updates.maxStreak = streak;
  }
  
  // 現在のストリークはセッション終了時にリセット
  updates.currentStreak = 0;
  
  // 満点の場合はセッション精度を100%に
  if (correct === total && total > 0) {
    updates.sessionAccuracy = 100;
  }
  
  return await updateUserStats(updates);
};

// バッジ獲得回数を更新
export const updateBadgeEarnCount = async (badgeId, increment = 1) => {
  try {
    const stats = await loadUserStats();
    if (!stats.badgeEarnCounts) {
      stats.badgeEarnCounts = {};
    }
    stats.badgeEarnCounts[badgeId] = (stats.badgeEarnCounts[badgeId] || 0) + increment;
    await saveUserStats(stats);
    return stats;
  } catch (error) {
    console.error('バッジ獲得回数更新エラー:', error);
    return await loadUserStats();
  }
};

// バッジ獲得回数を取得
export const getBadgeEarnCount = async (badgeId) => {
  try {
    const stats = await loadUserStats();
    return stats.badgeEarnCounts?.[badgeId] || 0;
  } catch (error) {
    console.error('バッジ獲得回数取得エラー:', error);
    return 0;
  }
};
