// components/BadgeDisplay.js
import React from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity } from 'react-native';
import { badgeDefinitions } from '../badges/BadgeDefinitions';

export const BadgeItem = ({ badge, onPress }) => {
  // 獲得回数ラベルの計算
  const getCountLabel = (count) => {
    if (count >= 25) return 'x25+';
    if (count >= 10) return 'x10';
    if (count >= 5) return 'x5';
    if (count >= 1) return 'x1';
    return '';
  };

  return (
    <TouchableOpacity 
      style={styles.badgeContainer} 
      onPress={() => onPress && onPress(badge)}
      disabled={!badge.earned}
    >
      <View style={styles.badgeImageContainer}>
        <Image 
          source={badge.imagePath} 
          style={[
            styles.badgeImage,
            !badge.earned && styles.badgeImageGray
          ]}
          resizeMode="contain"
        />
        {badge.earned && badge.earnedCount > 0 && (
          <View style={styles.countOverlay}>
            <Text style={styles.countOverlayText}>
              {getCountLabel(badge.earnedCount)}
            </Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.badgeName,
        !badge.earned && styles.badgeNameGray
      ]}>
        {badge.earned ? badge.name : '？？？'}
      </Text>
      <Text style={[
        styles.badgeDescription,
        !badge.earned && styles.badgeDescriptionGray
      ]}>
        {badge.earned ? badge.description : '条件を満たすと獲得できます'}
      </Text>
    </TouchableOpacity>
  );
};

export const BadgeGrid = ({ userStats, onBadgePress }) => {
  // userStatsがない場合のデフォルト値
  const stats = userStats || {
    totalCorrect: 0,
    maxStreak: 0,
    dailyProblemCount: 0,
    sessionAccuracy: 0,
    lastNDays: [],
    hardQuestionCorrect: 0,
    retryCorrect: 0,
    totalScore: 0,
    earnedBadgeCount: 0,
    badgeEarnCounts: {},
  };

  // userStatsからバッジを計算
  const badges = badgeDefinitions.map(badge => {
    const earned = badge.condition(stats);
    const earnedCount = stats.badgeEarnCounts?.[badge.id] || (earned ? 1 : 0);
    return {
      ...badge,
      earned,
      earnedCount,
    };
  });

  const renderBadge = ({ item }) => (
    <BadgeItem badge={item} onPress={onBadgePress} />
  );

  return (
    <FlatList
      data={badges}
      renderItem={renderBadge}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      contentContainerStyle={styles.gridContainer}
      columnWrapperStyle={styles.row}
    />
  );
};

export const BadgeSummary = ({ userStats }) => {
  // userStatsがない場合のデフォルト値
  const stats = userStats || {
    totalCorrect: 0,
    maxStreak: 0,
    dailyProblemCount: 0,
    sessionAccuracy: 0,
    lastNDays: [],
    hardQuestionCorrect: 0,
    retryCorrect: 0,
    totalScore: 0,
    earnedBadgeCount: 0,
    badgeEarnCounts: {},
  };

  // userStatsからバッジを計算
  const badges = badgeDefinitions.map(badge => {
    const earned = badge.condition(stats);
    return {
      ...badge,
      earned,
    };
  });
  
  const earnedCount = badges.filter(badge => badge.earned).length;
  const totalCount = badges.length;
  const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  
  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>🏆 バッジコレクション</Text>
      <Text style={styles.summaryText}>
        {earnedCount} / {totalCount} 獲得済み ({percentage}%)
      </Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${percentage}%` }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-around',
  },
  badgeContainer: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  badgeImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  badgeImage: {
    width: 60,
    height: 60,
  },
  badgeImageGray: {
    opacity: 0.3,
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  countOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  countOverlayText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  badgeNameGray: {
    color: '#999',
  },
  badgeDescription: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    lineHeight: 12,
  },
  badgeDescriptionGray: {
    color: '#ccc',
  },
  summaryContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2e7d32',
  },
  summaryText: {
    fontSize: 16,
    color: '#388e3c',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
});
