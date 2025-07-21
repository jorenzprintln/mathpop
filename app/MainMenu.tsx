import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Image, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const { width, height } = Dimensions.get('window');

// Define your RootStackParamList for type safety
type RootStackParamList = {
  TimeMode: { difficulty: string };
  SurvivalMode: { difficulty: string };
  ScoreHistory: undefined; // Add ScoreHistory with no parameters
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const MainMenu = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentMode, setCurrentMode] = useState<'time' | 'survival' | null>(null); // 'time' or 'survival'

  const openTimeModal = () => {
    setCurrentMode('time');
    setModalVisible(true);
  };

  const openSurvivalModal = () => {
    setCurrentMode('survival');
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const navigateToMode = (difficulty: string): void => {
    closeModal();
    if (currentMode === 'time') {
      navigation.navigate('TimeMode', { difficulty });
    } else if (currentMode === 'survival') {
      navigation.navigate('SurvivalMode', { difficulty });
    }
  };

  return (
    <LinearGradient colors={['#6dd5ed', '#2193b0']} style={styles.gradient}>
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.content}>
          <TouchableOpacity style={styles.menuButton1} onPress={openTimeModal}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>     
            <Image       source={require('../assets/images/hourglass.png')}       style={{ width: width * 0.06, height: width * 0.06, marginRight: 10 }}       resizeMode="contain"     />  
            <Text style={styles.menuText}>Time Mode</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={openSurvivalModal}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>     
            <Image source={require('../assets/images/heart.png')}style={{ width: width * 0.06, height: width * 0.06, marginRight: 10 }}resizeMode="contain"/>
            <Text style={styles.menuText}>Survival Mode</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton2} onPress={() => navigation.navigate('ScoreHistory')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>     
            <Image source={require('../assets/images/file (1).png')}style={{ width: width * 0.06, height: width * 0.06, marginRight: 10 }}resizeMode="contain"/>
            <Text style={styles.menuText}>Score History</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Modal transparent visible={isModalVisible} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Difficulty</Text>
              <TouchableOpacity 
                style={[styles.difficultyButton, { backgroundColor: '#27ae60' }]} 
                onPress={() => navigateToMode('easy')}
              >
                <View style={styles.buttonContent}>
                  <Image source={require('../assets/images/baby.png')} style={styles.buttonIcon} />
                  <Text style={styles.difficultyText}>Easy</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.difficultyButton, { backgroundColor: '#f39c12' }]} 
                onPress={() => navigateToMode('moderate')}
              >
                <View style={styles.buttonContent}>
                  <Image source={require('../assets/images/young-man.png')} style={styles.buttonIcon} />
                  <Text style={styles.difficultyText}>Moderate</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.difficultyButton, { backgroundColor: '#c0392b' }]} 
                onPress={() => navigateToMode('hard')}
              >
                <View style={styles.buttonContent}>
                  <Image source={require('../assets/images/hard.png')} style={styles.buttonIcon} />
                  <Text style={styles.difficultyText}>Hard</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Image
                  source={require('../assets/images/error.png')}
                  style={{ width: 35, height: 35 }} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  menuButton: {
    backgroundColor: '#f0932b',
    width: width * 0.7,
    paddingVertical: height * 0.020,
    borderRadius: 25,
    alignItems: 'center',
    bottom: 25,
  },
   menuButton2: {
    backgroundColor: '#05c46b',
    width: width * 0.7,
    paddingVertical: height * 0.020,
    borderRadius: 25,
    alignItems: 'center',
    top: 25,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 22,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 25,
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  difficultyButton: {
    paddingVertical: 12,
    width: '70%',
    marginVertical: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default MainMenu;