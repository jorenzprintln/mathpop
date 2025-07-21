import React from 'react';
import { View, StyleSheet } from 'react-native';
import TimeMode from './TimeMode'; 
import SurvivalMode from './SurvivalMode';
import MainMenu from './MainMenu';
export default function App() {
  return (
    <View style={styles.container}>
      <TimeMode />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
