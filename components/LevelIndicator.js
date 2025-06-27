// components/LevelIndicator.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LevelIndicator = ({ level, xp, xpForNextLevel }) => {
  const progress = xpForNextLevel > 0 ? xp / xpForNextLevel : 0;

  return (
    <View style={styles.levelContainer}>
      <Text style={styles.levelText}>Lv. {level}</Text>
      <View style={styles.xpBarBackground}>
        <View style={[styles.xpBarForeground, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>{xp} / {xpForNextLevel} XP</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  xpBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarForeground: {
    height: '100%',
    backgroundColor: '#4caf50', // Green progress bar
    borderRadius: 6,
  },
  xpText: {
    fontSize: 12,
    marginLeft: 10,
    color: '#666',
    fontWeight: '500',
  },
});
