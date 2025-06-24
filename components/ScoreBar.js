// ScoreBar.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

export const ScoreBar = ({ score, onReset }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Score: {score}</Text>
      {onReset && (
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetText}>リセット</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ScoreAnimation = ({ visible, onComplete }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-50)).current;

  React.useEffect(() => {
    if (visible) {
      // アニメーション開始
      Animated.sequence([
        // フェードイン + 上に移動
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // 少し停止
        Animated.delay(700),
        // フェードアウト + さらに上に移動
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // アニメーション終了時にリセット
        opacity.setValue(0);
        translateY.setValue(-50);
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.animationContainer, 
      {
        opacity: opacity,
        transform: [{ translateY: translateY }],
      }
    ]}>
      <Text style={styles.animationText}>+10点！</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  scoreText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  resetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  animationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }],
    zIndex: 1000,
  },
  animationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
