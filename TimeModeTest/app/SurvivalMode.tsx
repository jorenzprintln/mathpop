import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Image, 
  TouchableWithoutFeedback,
  Animated,
  Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Cloud from './Cloud';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
const { width, height } = Dimensions.get('window');

// Balloon component
const Balloon = ({ number, onPress, position, animatedValue }: { 
  number: number; 
  onPress: () => void; 
  position: { x: number };
  animatedValue: Animated.Value 
}) => {
  const balloonColors = ['#FCCB90'];
  const randomColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      onPress();
    });
  };
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.x,
        top: -150, // Start above the visible screen
        transform: [{ translateY: animatedValue }],
        zIndex: 10,
        width: 60,
        height: 90,
        alignItems: 'center',
      }}
    >
      <TouchableOpacity 
        onPress={handlePress} 
        activeOpacity={0.8} 
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View
          style={[
            styles.balloonInner,
            { 
              backgroundColor: randomColor,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.balloonText}>{number}</Text>
        </Animated.View>
        <View style={styles.balloonString} />
      </TouchableOpacity>
    </Animated.View>
  );
};
interface HeartPowerupData {
  id: string;
  position: { x: number };
  animValue: Animated.Value;
}

interface BalloonData {
  id: string;
  number: number;
  position: { x: number };
  animValue: Animated.Value;
}

const SurvivalMode = ({ navigation }: any) => {
  const [gameOver, setGameOver] = useState(false);
  const [highestScore, setHighestScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lives, setLives] = useState(3);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [problem, setProblem] = useState('Press Play to Start');
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [problemLevel, setProblemLevel] = useState(1);
  const [showCountdown, setShowCountdown] = useState(false);
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [heartPowerups, setHeartPowerups] = useState<HeartPowerupData[]>([]);
  const [sound, setSound] = useState<Audio.Sound>();
  const balloonAnimations = useRef<Animated.Value[]>([]).current;
  const problemIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const balloonGenerationRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationInterval = useRef<NodeJS.Timeout | null>(null);
  const [shouldVibrate, setShouldVibrate] = useState(false);

  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  });

  // Vibration effect
  useEffect(() => {
    if (shouldVibrate) {
      vibrationInterval.current = setInterval(() => {
        Vibration.vibrate(500);
      }, 1000);
    } else {
      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        Vibration.cancel();
      }
    }

    return () => {
      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        Vibration.cancel();
      }
    };
  }, [shouldVibrate]);


  const loadSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/audio/pop.mp3')
    );
    setSound(sound);
  };
  
  useEffect(() => {
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);
  
  // Load highest score
  useEffect(() => {
    const loadHighestScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem('highestScore');
        if (savedScore !== null) {
          setHighestScore(parseInt(savedScore));
        }
      } catch (e) {
        console.error('Failed to load high score', e);
      }
    };
    
    loadHighestScore();
  }, []);

  // Update highest score when game over
  useEffect(() => {
    const updateHighestScore = async () => {
      if (score > highestScore) {
        setHighestScore(score);
        try {
          await AsyncStorage.setItem('highestScore', score.toString());
        } catch (e) {
          console.error('Failed to save high score', e);
        }
      }
    };
    
    if (gameOver) {
      updateHighestScore();
    }
  }, [gameOver, score, highestScore]);

  // Countdown timer effect
  useEffect(() => {
    if (showCountdown) {
      setCountdown('3');
      
      timerRef.current = setTimeout(() => {
        setCountdown('2');
        
        timerRef.current = setTimeout(() => {
          setCountdown('1');
          
          timerRef.current = setTimeout(() => {
            setCountdown('GO!');
            
            timerRef.current = setTimeout(() => {
              setShowCountdown(false);
              setCountdown(null);
              generateNewProblem();
              startContinuousBalloonGeneration();
            }, 700);
          }, 1000);
        }, 1000);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showCountdown]);

  // Problem generation timer
  useEffect(() => {
    let problemTimer: NodeJS.Timeout;
    
    if (isPlaying && !isPaused && !gameOver) {
      problemTimer = setInterval(() => {
        generateNewProblem();
      }, 10000);
    }
    
    return () => {
      if (problemTimer) clearInterval(problemTimer);
    };
  }, [isPlaying, isPaused, gameOver, problemLevel]);

  // Update problem level based on score
  useEffect(() => {
    if (score >= 100) {
      setProblemLevel(5);
    } else if (score >= 75) {
      setProblemLevel(4);
    } else if (score >= 50) {
      setProblemLevel(3);
    } else if (score >= 25) {
      setProblemLevel(2);
    } else {
      setProblemLevel(1);
    }
    
    if (isPlaying && !isPaused) {
      generateNewProblem();
    }
  }, [score, isPlaying, isPaused]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (problemIntervalRef.current) clearInterval(problemIntervalRef.current);
      if (balloonGenerationRef.current) clearInterval(balloonGenerationRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      
      balloonAnimations.forEach(anim => {
        if (anim && anim.stopAnimation) anim.stopAnimation();
      });
      
      setHeartPowerups(prev => {
        prev.forEach(heart => {
          if (heart.animValue && heart.animValue.stopAnimation) {
            heart.animValue.stopAnimation();
          }
        });
        return [];
      });
    };
  }, []);

  const getRandomNumber = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const startContinuousBalloonGeneration = () => {
    if (balloonGenerationRef.current) clearInterval(balloonGenerationRef.current);
    
    generateBalloonWave();
    
    balloonGenerationRef.current = setInterval(() => {
      if (isPlaying && !isPaused) {
        generateBalloonWave();
        generateHeartPowerup();
      }
    }, 2000);
  };

  const generateBalloonWave = () => {
    if (!isPlaying || isPaused) return;
    
    const baseCount = 5;
    const additional = Math.floor(problemLevel * 1.5);
    const count = Math.min(baseCount + additional, 12);

    for (let i = 0; i < count; i++) {
      setTimeout(() => generateBalloon(), i * 300);
    }
  };

  const generateBalloon = () => {
    if (!isPlaying || isPaused) return;
    
    const isCorrectBalloon = Math.random() < 0.3;
    let balloonNumber;
    
    if (isCorrectBalloon && correctAnswer !== null) {
      balloonNumber = correctAnswer;
    } else {
      do {
        balloonNumber = getRandomNumber(1, problemLevel === 1 ? 9 : 99);
      } while (balloonNumber === correctAnswer);
    }
    
    const xPosition = getRandomNumber(0, width - 50);
    const animValue = new Animated.Value(-150); 
    
    const duration = 8000 - (problemLevel * 500);
    
    Animated.timing(animValue, {
      toValue: height + 100,
      duration: Math.max(duration, 3000),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setBalloons(prev => prev.filter(b => b.animValue !== animValue));
        if (balloonNumber === correctAnswer) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) endGame();
            return newLives;
          });
        }
      }
    });
    
    setBalloons(prev => [
      ...prev,
      {
        id: Date.now() + Math.random().toString(),
        number: balloonNumber,
        position: { x: xPosition },
        animValue
      }
    ]);
  };
  const generateHeartPowerup = () => {
    if (lives >= 3 || !isPlaying || isPaused) return;
    if (Math.random() > 0.1) return; // 10% chance
    
    const xPosition = getRandomNumber(50, width - 100);
    const animValue = new Animated.Value(-150);
    
    const heartId = Math.random().toString();
    
    setHeartPowerups(prev => [...prev, { 
      id: heartId, 
      position: { x: xPosition },
      animValue
    }]);
    
    Animated.timing(animValue, {
      toValue: height + 150,
      duration: 8000,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setHeartPowerups(prev => prev.filter(heart => heart.id !== heartId));
      }
    });
  };

  const collectHeart = (heartId: string) => {
    setLives(prev => Math.min(prev + 1, 3));
    setHeartPowerups(prev => prev.filter(heart => heart.id !== heartId));
  };

  const HeartPowerup = ({ id, position, animValue }: { 
    id: string; 
    position: { x: number }; 
    animValue: Animated.Value 
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    const handlePress = () => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          delay: 150
        })
      ]).start(() => {
        collectHeart(id);
      });
    };
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: position.x,
          transform: [{ translateY: animValue }],
          zIndex: 15,
        }}
      >
        <TouchableOpacity onPress={handlePress} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <View style={styles.heartPowerup}>
            <Image
              source={require('../assets/images/heart.png')}
              style={styles.heartPowerupImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const generateNewProblem = () => {
    if (!isPlaying || isPaused) return;
    
    let newProblem = '';
    let answer = null;

    switch(problemLevel) {
      case 1:
        const targetNumber = getRandomNumber(1, 9);
        newProblem = `Tap all numbers equal to ${targetNumber}`;
        answer = targetNumber;
        break;
        
      case 2:
        const isAddition = Math.random() > 0.5;
        const num1 = getRandomNumber(1, 9);
        const num2 = getRandomNumber(1, 9);
        
        if (isAddition) {
          newProblem = `${num1} + ${num2} = ?`;
          answer = num1 + num2;
        } else {
          const [larger, smaller] = num1 >= num2 ? [num1, num2] : [num2, num1];
          newProblem = `${larger} - ${smaller} = ?`;
          answer = larger - smaller;
        }
        break;
        
      case 3:
        const isAdditionL3 = Math.random() > 0.5;
        
        if (isAdditionL3) {
          const num1 = getRandomNumber(10, 50);
          const num2 = getRandomNumber(10, 99 - num1);
          newProblem = `${num1} + ${num2} = ?`;
          answer = num1 + num2;
        } else {
          const num1 = getRandomNumber(20, 99);
          const num2 = getRandomNumber(10, num1 - 1);
          newProblem = `${num1} - ${num2} = ?`;
          answer = num1 - num2;
        }
        break;
        
      case 4:
        const isMultiplication = Math.random() > 0.5;
        
        if (isMultiplication) {
          const num1 = getRandomNumber(2, 9);
          const num2 = getRandomNumber(2, 9);
          newProblem = `${num1} × ${num2} = ?`;
          answer = num1 * num2;
        } else {
          const divisor = getRandomNumber(2, 9);
          const result = getRandomNumber(1, 10);
          const dividend = divisor * result;
          newProblem = `${dividend} ÷ ${divisor} = ?`;
          answer = result;
        }
        break;
        
      case 5:
        const problemType = getRandomNumber(1, 4);
        
        switch (problemType) {
          case 1:
            const num1 = getRandomNumber(10, 50);
            const num2 = getRandomNumber(10, 89 - num1);
            newProblem = `${num1} + ${num2} = ?`;
            answer = num1 + num2;
            break;
            
          case 2:
            const minuend = getRandomNumber(30, 99);
            const subtrahend = getRandomNumber(10, minuend - 10);
            newProblem = `${minuend} - ${subtrahend} = ?`;
            answer = minuend - subtrahend;
            break;
            
          case 3:
            const factor1 = getRandomNumber(2, 12);
            const factor2 = getRandomNumber(2, 12);
            newProblem = `${factor1} × ${factor2} = ?`;
            answer = factor1 * factor2;
            break;
            
          case 4:
            const div = getRandomNumber(2, 10);
            const quotient = getRandomNumber(1, 10);
            const dividend = div * quotient;
            newProblem = `${dividend} ÷ ${div} = ?`;
            answer = quotient;
            break;
        }
        break;
    }
    
    setProblem(newProblem);
    setCorrectAnswer(answer);
  };

  const handleBalloonTap = async (number: number) => {
    if (isPaused || !isPlaying) return;
    
    try {
      // Play pop sound
      if (sound) {
        await sound.replayAsync();
      }
      // Add haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log("Error with sound/haptics:", error);
    }
    
    if (number === correctAnswer) {
      setScore(prev => prev + 5);
      setBalloons(prev => prev.filter(balloon => balloon.number !== number));
      generateNewProblem();
    } else {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) endGame();
        return newLives;
      });
    }
  };

  const endGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    
    if (balloonGenerationRef.current) clearInterval(balloonGenerationRef.current);
    if (problemIntervalRef.current) clearInterval(problemIntervalRef.current);
    
    balloonAnimations.forEach(anim => {
      if (anim && anim.stopAnimation) anim.stopAnimation();
    });
    
    setHeartPowerups([]);
    setShouldVibrate(false);
  };

  const handleReplay = () => {
    setGameOver(false);
    setScore(0);
    setLives(3);
    setCountdown(null);
    setProblemLevel(1);
    setProblem('Press Play to Start');
    setIsPlaying(true);
    setIsPaused(false);
    setShowCountdown(true);
    setBalloons([]);
    setHeartPowerups([]);
    balloonAnimations.length = 0;
  };

  const togglePause = () => {
    if (!isPlaying) return;
    setIsPaused(prev => !prev);
    
    if (!isPaused) {
      if (balloonGenerationRef.current) clearInterval(balloonGenerationRef.current);
      if (problemIntervalRef.current) clearInterval(problemIntervalRef.current);
      
      balloonAnimations.forEach(anim => {
        if (anim) anim.stopAnimation();
      });
    } else {
      startContinuousBalloonGeneration();
      generateNewProblem();
    }
  };

  const handlePlayPress = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setShowCountdown(true);
    } else {
      togglePause();
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#ff9a9e', '#fad0c4']} style={styles.container}>
      <View style={styles.topPanel}>
        <View style={styles.topRow}>
          <View style={styles.iconWrapper}>
            <Image
              source={require('../assets/images/crown.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.scoreText}>{highestScore}</Text> 
          </View>
          
          <View style={styles.livesContainer}>
            {[...Array(3)].map((_, i) => (
              <Image
                key={i}
                source={require('../assets/images/heart.png')}
                style={[
                  styles.heartIcon,
                  { 
                    tintColor: i < lives ? '#ff9a9e' : '#ccc',
                    opacity: i < lives ? 1 : 0.5
                  }
                ]}
                resizeMode="contain"
              />
            ))}
          </View>
        </View>

        {!showCountdown && (
          <Text style={styles.mathProblem}>
            {problem}
          </Text>
        )}

        <View style={styles.scoreRow}>
          <View style={styles.line} />
          <View style={styles.circle}>
            <Text style={styles.circleText}>{score}</Text>
          </View>
          <View style={styles.line} />
        </View>
      </View>

      <Cloud style={styles.cloud1} />
      <Cloud style={styles.cloud2} />

      <View style={styles.balloonsContainer}>
        {balloons.map((balloon) => (
          <Balloon
            key={balloon.id}
            number={balloon.number}
            onPress={() => handleBalloonTap(balloon.number)}
            position={balloon.position}
            animatedValue={balloon.animValue}
          />
        ))}

        {heartPowerups.map((heart) => (
          <HeartPowerup
            key={heart.id}
            id={heart.id}
            position={heart.position}
            animValue={heart.animValue}
          />
        ))}
      </View>

      {showCountdown && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.play} 
        onPress={handlePlayPress}
      >
        <Image
          source={
            isPlaying 
              ? require('../assets/images/pause (2).png')
              : require('../assets/images/play-button (2).png')
          }
          style={styles.playIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {isPaused && (
        <TouchableWithoutFeedback onPress={() => setIsPaused(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Image 
                source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')} 
                style={styles.logo}
              />
              
              <Text style={styles.highScoreText}>Highest Score: {highestScore}</Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setIsPaused(false)}
                >
                  <Image
                    source={require('../assets/images/play-button (2).png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={handleReplay}
                >
                  <Image
                    source={require('../assets/images/reload.png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => navigation.goBack()}
                >
                  <Image
                    source={require('../assets/images/home (3).png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      {gameOver && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Game Over!</Text>
            <Text style={styles.modalScore}>Your Score: {score}</Text>
            <Text style={styles.highScore}>Highest Score: {highestScore}</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.replayButton]}
                onPress={handleReplay}
              >
                <Text style={styles.buttonText}>Replay</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.homeButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balloonsContainer: {
    flex: 1,
    position: 'relative',
  },
  balloonInner: {
    width: 60,
    height: 70,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  heartPowerup: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  heartPowerupImage: {
    width: 40,
    height: 40,
    tintColor: '#FF4081',
  },
  balloonText: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  balloonString: {
    width: 2,
    height: 20,
    backgroundColor: '#AAAAAA',
    alignSelf: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontSize: 100,
    fontFamily: 'Poppins-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  buttonIcon: {
    width: 30,
    height: 30,
  },
  logo: {
    width: 100,
    height: 80,
    marginBottom: 10, 
  },
  highScoreText: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FF4081',
    marginBottom: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FF4081',
    marginBottom: 10,
  },
  modalScore: {
    fontSize: 22,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: '45%',
    alignItems: 'center',
  },
  replayButton: {
    backgroundColor: '#4CAF50',
  },
  homeButton: {
    backgroundColor: '#FF4081',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    alignSelf: 'center',
  },
  play: {
    backgroundColor: '#ff9a9e',
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 15,
  },
  playIcon: {
    width: 28,
    height: 28,
    alignSelf: 'center',
    marginTop: 16,
  },
  cloud1: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.05,
  },
  cloud2: {
    position: 'absolute',
    top: height * 0.3,
    right: width * 0.05,
  },
  icon: {
    width: 30,
    height: 30,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#000',
    marginTop: 5,
  },
  topPanel: {
    width: '100%',
    backgroundColor: '#ffffffcc',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
    alignItems: 'center',
  },
  mathProblem: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#000',
    textAlign: 'center',
    marginVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#000',
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  circleText: {
    fontSize: 35,
    fontFamily: 'Poppins-Bold',
    color: '#000',
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartIcon: {
    width: 30,
    height: 30,
    marginHorizontal: 2,
  },
  highScore: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    marginBottom: 20,
  },
});

export default SurvivalMode;