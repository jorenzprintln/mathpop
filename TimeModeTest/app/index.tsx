import React from 'react';
import { View, StyleSheet } from 'react-native';
import TimeMode from './TimeMode'; // Adjust the import path as necessary
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
