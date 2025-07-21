import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import SplashScreen from './index';
import MainMenu from './MainMenu';
import TimeMode from './TimeMode';
import SurvivalMode from './SurvivalMode';
import ScoreHistory from './ScoreHistory';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainMenu" component={MainMenu} />
        <Stack.Screen name="TimeMode" component={TimeMode} />
        <Stack.Screen name="SurvivalMode" component={SurvivalMode} />
        <Stack.Screen name="ScoreHistory" component={ScoreHistory} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}