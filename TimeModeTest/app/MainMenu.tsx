import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MainMenu({ navigation }: any) {
  return (
    <LinearGradient
      colors={['#6dd5ed', '#2193b0']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')} // replace with your actual path
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.content}>
        <TouchableOpacity style={styles.menuButton1} onPress={() => navigation.navigate('TimeMode')}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Image
      source={require('../assets/images/hourglass.png')}
      style={{ width: width * 0.06, height: width * 0.06, marginRight: 10 }}
      resizeMode="contain"
    />
    <Text style={styles.menuText}>Time Mode</Text>
  </View>
</TouchableOpacity>

<TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('SurvivalMode')}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Image
      source={require('../assets/images/heart.png')}
      style={{ width: width * 0.06, height: width * 0.06, marginRight: 10 }}
      resizeMode="contain"
    />
    <Text style={styles.menuText}>Survival Mode</Text>
  </View>
</TouchableOpacity>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
  },
  header: {
    paddingTop: height * 0.05,
    marginBottom: height * 0.03,
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    top: 100,
    width: width * 2,
    height: height * 0.35,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: '#00000050',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  text: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: '#f0932b',
    width: width * 0.7,
    paddingVertical: height * 0.020,
    borderRadius: 25,
    alignItems: 'center',
    bottom: 25,
  },
  menuButton1: {
    backgroundColor: '#2e86de',
    width: width * 0.7,
    paddingVertical: height * 0.020,
    borderRadius: 25,
    alignItems: 'center',
    bottom: 80,
  },
  menuText: {
    fontSize: width * 0.05,
    fontFamily: 'Poppins-Bold',
    color: 'white',
  },
});
