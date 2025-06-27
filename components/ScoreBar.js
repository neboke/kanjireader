// components/ScoreBar.js
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export const ScoreBar = ({ score, level, xp, nextLevelXp }) => {
  const progress = nextLevelXp > 0 ? (xp / nextLevelXp) * 100 : 0;
  
  return (
    <View style={styles.scoreContainer}>
      <Text style={styles.scoreText}>スコア: {score}点</Text>
      <Text style={styles.levelText}>レベル {level}</Text>
      <View style={styles.xpBarContainer}>
        <View style={[styles.xpBar, { width: `${Math.min(progress, 100)}%` }]} />
      </View>
      <Text style={styles.xpText}>XP: {xp} / {nextLevelXp}</Text>
    </View>
  );
};

export const ScoreAnimation = ({ visible, points, onAnimationEnd }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onAnimationEnd) onAnimationEnd();
        });
      }, 1500);
    }
  }, [visible, fadeAnim, slideAnim, onAnimationEnd]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.animationContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.animationText}>+{points}点!</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  levelText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  xpBarContainer: {
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  xpBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  xpText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  animationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 1000,
  },
  animationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
});
