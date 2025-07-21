// Balloon.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface BalloonProps {
  number: number;
  style?: object;
  position: Animated.Value;
}

const Balloon: React.FC<BalloonProps> = ({ number, style, position }) => {
  return (
    <Animated.View style={[styles.balloon, style, { transform: [{ translateY: position }] }]}>
      <Text style={styles.balloonText}>{number}</Text>
    </Animated.View>
  );
};
interface BalloonProps {
    number: number;
    onPress: () => void; // Add the onPress property
  }
const styles = StyleSheet.create({
  balloon: {
    width: 60,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  balloonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Balloon;
