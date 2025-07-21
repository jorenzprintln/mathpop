import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { Audio } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Define the type for your navigation stack
type RootStackParamList = {
  MainMenu: undefined;
  // Add other screens as needed
};

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainMenu'>;

const AppSplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Load fonts
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  });
  
  // Load audio
// In AppSplashScreen.tsx
const loadAudio = async () => {
  try {
    const { sound: popSound } = await Audio.Sound.createAsync(
      require('../assets/audio/pop.mp3')
    );
    const { sound: wrongSound } = await Audio.Sound.createAsync(
      require('../assets/audio/wrong-47985 (mp3cut.net).mp3')
    );
    setSound(popSound);
    setWrongSound(wrongSound);
    return { popSound, wrongSound };
  } catch (error) {
    console.error('Error loading audio:', error);
    return null;
  }
};
  
  // Load all resources and prepare the app
  useEffect(() => {
    async function prepare() {
      try {
        if (!fontsLoaded) {
          return; // Wait until fonts are loaded
        }
        
        // Load audio resources
        const audioLoaded = await loadAudio();
        
        // Let's play the sound once to ensure it's ready
        if (audioLoaded) {
          await audioLoaded.popSound.playAsync();
        }
        
        // Artificially wait for 3 seconds to show our custom splash screen
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Set app as ready
        setAppIsReady(true);
      } catch (e) {
        console.warn('Error loading resources:', e);
      }
    }
    
    prepare();
  }, [fontsLoaded]);
  
  // Handle the transition from Expo splash screen to our app
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
      
      // Navigate to main menu after our custom splash screen
      setTimeout(() => {
        navigation.replace('MainMenu');
      }, 3000); // Short delay to ensure smooth transition
    }
  }, [appIsReady, navigation]);
  
  // Clean up resources when unmounting
useEffect(() => {
  return () => {
    if (sound) {
      sound.unloadAsync();
    }
    if (wrongSound) {
      wrongSound.unloadAsync();
    }
  };
}, [sound, wrongSound]);
  
  if (!appIsReady) {
    return null;
  }
  
  // Our custom splash screen UI with loading indicator
  return (
    <LinearGradient
      colors={['#2F80ED', '#56CCF2', '#BB6BD9']} // Vibrant blue-to-purple gradient
      style={styles.container}
      onLayout={onLayoutRootView}
    >
      <StatusBar hidden />
      <Image
        source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')}
        style={styles.logo}
        resizeMode="contain"
      />
  
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    </LinearGradient>
  );
  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '70%',
    height: '30%',
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
});

export default AppSplashScreen;