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
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Cloud from './Cloud';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
const { width, height } = Dimensions.get('window');
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
export type SurvivalModeDifficultyLevel = 'easy' | 'moderate' | 'hard';
export type RootStackParamList = {
  MainMenu: undefined;
  SurvivalMode: { difficulty: SurvivalModeDifficultyLevel };
  Splash: undefined;
};
type SurvivalModeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SurvivalMode'>;

type SurvivalModeRouteProp = RouteProp<RootStackParamList, 'SurvivalMode'>;

const Balloon = ({ id, number, onPress, position, animatedValue, isPaused, hasHeart = false, currentTarget }: { 
  id: string;
  number: number; 
  onPress: (id: string, number: number, hasHeart: boolean, isWrong: boolean) => void; 
  position: { x: number };
  animatedValue: Animated.Value;
  isPaused: boolean;
  hasHeart?: boolean;
  currentTarget: number | null;
}) => {
  const balloonColors = ['#FCCB90'];
  const randomColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bombAnim = useRef(new Animated.Value(0)).current;
  const [showBomb, setShowBomb] = useState(false);
  
  const handlePress = () => {
    if (isPaused) return;
    
    const isWrongBalloon = currentTarget !== null && number !== currentTarget && !hasHeart;

    if (isWrongBalloon) {
      setShowBomb(true);
      Animated.sequence([
        Animated.timing(bombAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        onPress(id, number, hasHeart, true);
      });
    } else {
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
        onPress(id, number, hasHeart, false);
      });
    }
  };
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.x,
        top: -150,
        transform: [{ translateY: animatedValue }],
        zIndex: 10,
        width: 60,
        height: 90,
        alignItems: 'center',
      }}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          {showBomb ? (
            <Animated.View 
              style={{
                opacity: bombAnim,
                transform: [
                  { scale: bombAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 2]
                  }) }
                ]
              }}
            >
              <Image 
                source={require('../assets/images/bomb.png')} 
                style={{ 
                  width: 60, 
                  height: 60, 
                  tintColor: 'red' 
                }} 
              />
            </Animated.View>
          ) : (
            <>
              <View
                style={[
                  styles.balloonInner,
                  {
                    backgroundColor: randomColor,
                  },
                ]}
              >
                {hasHeart ? (
                  <Image
                    source={require('../assets/images/heart.png')}
                    style={{width: 20, height: 20, marginBottom: 2, tintColor: '#ff9a9e'}}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.balloonText}>{number}</Text>
                )}
              </View>
              <View style={styles.balloonString} />
            </>
          )}
        </Animated.View>
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
  hasHeart?: boolean;
}
const SurvivalMode = () => {
  const navigation = useNavigation<SurvivalModeNavigationProp>();
  const route = useRoute<SurvivalModeRouteProp>();
  const { difficulty = 'easy' } = route.params || {};
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
  const balloonGenerationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldVibrate, setShouldVibrate] = useState(false);
  const currentDifficultyRef = useRef<SurvivalModeDifficultyLevel>(difficulty);
  const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  });
  const easySpeed = 1;
  const moderateSpeed = 1.5;
  const hardSpeed = 2;

  const speedMultiplier = difficulty === 'easy' ? easySpeed : 
                          difficulty === 'moderate' ? moderateSpeed : 
                          difficulty === 'hard' ? hardSpeed : easySpeed;

  const getHighScoreKey = (difficultyLevel: SurvivalModeDifficultyLevel) => {
    return `survivalModeHighScore_${difficultyLevel}`;
  };

  useFocusEffect(
    React.useCallback(() => {
      if (currentDifficultyRef.current !== difficulty) {
        resetGameState();
        currentDifficultyRef.current = difficulty;
        loadHighScore(difficulty);
      }
      
      return () => {
        cleanupTimers();
      };
    }, [difficulty])
  );

  
  const cleanupTimers = () => {
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
const saveScore = async (mode: string, difficulty: string, score: number) => {
  try {
    const timestamp = new Date().toISOString();
    const scoreEntry = {
      mode,
      difficulty,
      score,
      timestamp,
    };
    
    const existingScores = await AsyncStorage.getItem('@scoreHistory');
    const scores = existingScores ? JSON.parse(existingScores) : [];
    
    scores.push(scoreEntry);
    await AsyncStorage.setItem('@scoreHistory', JSON.stringify(scores));
  } catch (e) {
    console.error('Failed to save score history:', e);
  }
};
  const resetGameState = () => {
    setGameOver(false);
    setScore(0);
    setLives(3);
    setCountdown(null);
    setProblemLevel(1);
    setProblem('Press Play to Start');
    setBalloons([]);
    setHeartPowerups([]);
    setCorrectAnswer(null);
    setIsPlaying(false);
    setIsPaused(false);
    setShouldVibrate(false);
    cleanupTimers();
  };

  const loadHighScore = async (difficultyLevel: SurvivalModeDifficultyLevel) => {
    try {
      const scoreKey = getHighScoreKey(difficultyLevel);
      const savedScore = await AsyncStorage.getItem(scoreKey);
      if (savedScore !== null) {
        const parsedScore = parseInt(savedScore, 10);
        if (!isNaN(parsedScore)) {
          setHighestScore(parsedScore);
        } else {
          setHighestScore(0);
        }
      } else {
        setHighestScore(0);
      }
    } catch (e) {
      console.error(`Failed to load high score for ${difficultyLevel}:`, e);
      setHighestScore(0);
    }
  };

  useEffect(() => {
    loadHighScore(difficulty);
    
    return () => {
      cleanupTimers();
    };
  }, []);
  
  useEffect(() => {
    const updateHighestScore = async () => {
      if (score > highestScore) {
        setHighestScore(score);
        try {
          const scoreKey = getHighScoreKey(difficulty);
          await AsyncStorage.setItem(scoreKey, score.toString());
        } catch (e) {
          console.error(`Failed to save high score for ${difficulty}:`, e);
        }
      }
    };
    
    if (gameOver) {
      updateHighestScore();
    }
  }, [gameOver, score, highestScore, difficulty]);

  const loadSound = async () => {
    try {
      const { sound: popSound } = await Audio.Sound.createAsync(
        require('../assets/audio/pop.mp3')
      );
      const { sound: wrongSound } = await Audio.Sound.createAsync(
        require('../assets/audio/wrong-47985 (mp3cut.net).mp3')
      );
      setSound(popSound);
      setWrongSound(wrongSound);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };
  useEffect(() => {
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (wrongSound) {
        wrongSound.unloadAsync();
      }
    };
  }, []);
  
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

  useEffect(() => {
    let problemTimer: ReturnType<typeof setInterval>;
    
    if (isPlaying && !isPaused && !gameOver) {
      problemTimer = setInterval(() => {
        generateNewProblem();
      }, 10000);
    }
    
    return () => {
      if (problemTimer) clearInterval(problemTimer);
    };
  }, [isPlaying, isPaused, gameOver, problemLevel]);

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
    if (balloonGenerationRef.current) {
      clearInterval(balloonGenerationRef.current);
      balloonGenerationRef.current = null;
    }
    
    generateBalloonWave();
    
    const intervalBase = 2000;
    const intervalTime = intervalBase / speedMultiplier;
    
    balloonGenerationRef.current = setInterval(() => {
      if (isPlaying && !isPaused) {
        generateBalloonWave();
        
        const heartChance = difficulty === 'hard' ? 0.1 : 
                           difficulty === 'moderate' ? 0.15 : 0.2;
                           
        if (Math.random() < heartChance) {
          generateHeartPowerup();
        }
      }
    }, intervalTime);
  };
  
  const generateBalloonWave = () => {
    if (!isPlaying || isPaused) return;
    
    const baseCount = 5;
    const additional = Math.floor(problemLevel * 1.5);
    const count = Math.min(baseCount + additional, 12);
  
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (isPlaying && !isPaused) {
          generateBalloon();
        }
      }, i * (300 / speedMultiplier));
    }
    
    if (lives < 3) {
      const heartChance = difficulty === 'hard' ? 0.3 : 
                          difficulty === 'moderate' ? 0.4 : 0.5;
      
      if (Math.random() < heartChance) {
        generateHeartPowerup();
      }
    }
  };
  const generateBalloon = () => {
    if (!isPlaying || isPaused || gameOver) return;
    
    const isCorrectBalloon = Math.random() < 0.3;
    let balloonNumber;
    
    if (isCorrectBalloon && correctAnswer !== null) {
      balloonNumber = correctAnswer;
    } else {
      do {
        balloonNumber = getRandomNumber(0, problemLevel === 1 ? 9 : 99);
      } while (balloonNumber === correctAnswer);
    }
    
    const xPosition = getRandomNumber(0, width - 50);
    const animValue = new Animated.Value(-150); 
    
    const baseDuration = 8000 - (problemLevel * 500);
    const duration = baseDuration / speedMultiplier;
    
    const hasHeart = Math.random() < 0.05;
    const balloonId = Date.now() + Math.random().toString();
    
    setBalloons(prev => [
      ...prev,
      {
        id: balloonId,
        number: balloonNumber,
        position: { x: xPosition },
        animValue,
        hasHeart
      }
    ]);
    
    Animated.timing(animValue, {
      toValue: height + 100,
      duration: Math.max(duration, 3000 / speedMultiplier),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setBalloons(prev => {
          const stillExists = prev.some(b => b.id === balloonId);
          
          if (stillExists && balloonNumber === correctAnswer && !isPaused && isPlaying && !gameOver) {
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                requestAnimationFrame(endGame);
              }
              return newLives;
            });
          }
          
          return prev.filter(b => b.id !== balloonId);
        });
      }
    });
  };
  
  const generateHeartPowerup = () => {
    if (!isPlaying || isPaused) return;
    
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
      duration: 8000 / speedMultiplier,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setHeartPowerups(prev => prev.filter(heart => heart.id !== heartId));
      }
    });
  };

   const forceHeartGeneration = () => {
    const xPosition = getRandomNumber(50, width - 100);
    const animValue = new Animated.Value(-150);
    
    const heartId = "forced-" + Date.now().toString();
    
    setHeartPowerups(prev => [...prev, { 
      id: heartId, 
      position: { x: xPosition },
      animValue
    }]);
    
    Animated.timing(animValue, {
      toValue: height + 150,
      duration: 12000 / (speedMultiplier * 0.8),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setHeartPowerups(prev => prev.filter(heart => heart.id !== heartId));
      }
    });
  };
    
  const collectHeart = (heartId: string) => {
    if (isPaused) return;
    
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
      if (isPaused) return;
      
      if (lives < 3) {
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
      } else {
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start(() => {
          setHeartPowerups(prev => prev.filter(heart => heart.id !== id));
        });
      }
    };
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: position.x,
          top: -150,
          transform: [{ translateY: animValue }],
          zIndex: 15,
        }}
      >
        <TouchableOpacity onPress={handlePress} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.heartPowerup}>
              <Image
                source={require('../assets/images/heart.png')}
                style={[styles.heartPowerupImage, { tintColor: '#ff9a9e' }]}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  

const generateNewProblem = () => {
  if (!isPlaying || isPaused) return;
  
  let newProblem = '';
  let answer = null;

  if (score >= 100) {
    const problemType = getRandomNumber(1, 5);
    
    switch (problemType) {
      case 1:
        const targetNumber = getRandomNumber(0, 9);
        newProblem = `Tap number ${targetNumber}`;
        answer = targetNumber;
        break;
        
      case 2:
        const addend1 = getRandomNumber(0, 9);
        const addend2 = getRandomNumber(0, 9 - addend1);
        newProblem = `${addend1} + ${addend2} = ?`;
        answer = addend1 + addend2;
        break;
        
      case 3:
        const minuend = getRandomNumber(0, 9);
        const subtrahend = getRandomNumber(0, minuend);
        newProblem = `${minuend} - ${subtrahend} = ?`;
        answer = minuend - subtrahend;
        break;
        
      case 4:
        const possiblePairs = [
          [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
          [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9],
          [2, 1], [2, 2], [2, 3], [2, 4],
          [3, 1], [3, 2], [3, 3],
          [4, 1], [4, 2],
          [5, 1],
          [6, 1],
          [7, 1],
          [8, 1],
          [9, 1]
        ];
        const selectedPair = possiblePairs[Math.floor(Math.random() * possiblePairs.length)];
        newProblem = `${selectedPair[0]} × ${selectedPair[1]} = ?`;
        answer = selectedPair[0] * selectedPair[1];
        break;
        
      case 5:
        const divisor = getRandomNumber(1, 9);
        const quotient = getRandomNumber(0, 9);
        const dividend = divisor * quotient;
        newProblem = `${dividend} ÷ ${divisor} = ?`;
        answer = quotient;
        break;
    }
  }
  else if (score >= 75) {
    const divisor = getRandomNumber(1, 9);
    const quotient = getRandomNumber(0, 9);
    const dividend = divisor * quotient;
    newProblem = `${dividend} ÷ ${divisor} = ?`;
    answer = quotient;
  }
  else if (score >= 50) {
    const possiblePairs = [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9],
      [2, 1], [2, 2], [2, 3], [2, 4],
      [3, 1], [3, 2], [3, 3],
      [4, 1], [4, 2],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [9, 1]
    ];
    const selectedPair = possiblePairs[Math.floor(Math.random() * possiblePairs.length)];
    newProblem = `${selectedPair[0]} × ${selectedPair[1]} = ?`;
    answer = selectedPair[0] * selectedPair[1];
  }
  else if (score >= 25) {
    const isAddition = Math.random() > 0.5;
    
    if (isAddition) {
      const addend1 = getRandomNumber(0, 9);
      const addend2 = getRandomNumber(0, 9 - addend1);
      newProblem = `${addend1} + ${addend2} = ?`;
      answer = addend1 + addend2;
    } else {
      const minuend = getRandomNumber(0, 9);
      const subtrahend = getRandomNumber(0, minuend);
      newProblem = `${minuend} - ${subtrahend} = ?`;
      answer = minuend - subtrahend;
    }
  }
  else {
    const targetNumber = getRandomNumber(0, 9);
    newProblem = `Tap number ${targetNumber}`;
    answer = targetNumber;
  }
  
  setProblem(newProblem);
  setCorrectAnswer(answer);
};

interface HandleBalloonTapParams {
  balloonId: string;
  number: number;
  hasHeart?: boolean;
  isWrong?: boolean;
}

const handleBalloonTap = async ({ balloonId, number, hasHeart = false, isWrong = false }: HandleBalloonTapParams): Promise<void> => {
  if (isPaused || !isPlaying) return;
  
  try {
    if (isWrong) {
      if (wrongSound) {
        await wrongSound.replayAsync();
      }
    } else {
      if (sound) {
        await sound.replayAsync();
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.log("Error with sound/haptics:", error);
  }
  
  setBalloons(prev => prev.filter(balloon => balloon.id !== balloonId));
  
  if (hasHeart) {
    if (lives < 3) {
      setLives(prev => Math.min(prev + 1, 3));
    }
    return;
  }
  
  if (!isWrong && number === correctAnswer) {
    setScore(prev => prev + 5);
    generateNewProblem();
  } else if (!hasHeart) {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) endGame();
      return newLives;
    });
  }
};

  const endGame = () => {
    saveScore('Survival Mode', difficulty, score);
    setGameOver(true);
    setIsPlaying(false);
    
    if (balloonGenerationRef.current) {
      clearInterval(balloonGenerationRef.current);
      balloonGenerationRef.current = null;
    }
    if (problemIntervalRef.current) {
      clearInterval(problemIntervalRef.current);
      problemIntervalRef.current = null;
    }
    
    setBalloons(prev => {
      prev.forEach(balloon => {
        if (balloon.animValue) {
          balloon.animValue.stopAnimation();
        }
      });
      return [];
    });
    
    setHeartPowerups(prev => {
      prev.forEach(heart => {
        if (heart.animValue) {
          heart.animValue.stopAnimation();
        }
      });
      return [];
    });
    
    setShouldVibrate(false);
    setCorrectAnswer(null);
  };
  
const handleReplay = () => {
  endGame(); 
  
  setGameOver(false);
  setScore(0);
  setLives(3);
  setCountdown(null);
  setProblemLevel(1);
  setProblem('Press Play to Start');
  setBalloons([]);
  setHeartPowerups([]);
  
  setTimeout(() => {
    setIsPlaying(true);
    setIsPaused(false);
    setShowCountdown(true);
    
    setTimeout(() => {
      if (isPlaying && !isPaused && !gameOver) {
        forceHeartGeneration();
      }
    }, 5000);
  }, 100);
};
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    cleanupTimers();
  });

  return unsubscribe;
}, [navigation]);

useEffect(() => {
  let heartGenerationTimer: ReturnType<typeof setInterval>;
  
  if (isPlaying && !isPaused && !gameOver) {
    heartGenerationTimer = setInterval(() => {
      forceHeartGeneration();
    }, 30000);
  }
  
  return () => {
    if (heartGenerationTimer) clearInterval(heartGenerationTimer);
  };
}, [isPlaying, isPaused, gameOver]);

  const togglePause = () => {
    if (!isPlaying) return;
    
    setIsPaused(prev => !prev);
    
    if (isPaused) {
      generateNewProblem();
      if (!balloonGenerationRef.current) {
        startContinuousBalloonGeneration();
      }
    }
  };
  
  const handleContinue = () => {
    setIsPaused(false);
    
    generateNewProblem();
    
    if (!balloonGenerationRef.current) {
      startContinuousBalloonGeneration();
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
       <StatusBar hidden={true} />  
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
    id={balloon.id}
    number={balloon.number}
    onPress={(id, number, hasHeart, isWrong) => 
      handleBalloonTap({ balloonId: id, number, hasHeart, isWrong })
    }
    position={balloon.position}
    animatedValue={balloon.animValue}
    isPaused={isPaused}
    hasHeart={balloon.hasHeart}
    currentTarget={correctAnswer}
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
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Image 
                source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')} 
                style={styles.logo}
              />
              
              <Text style={styles.highScoreText}>Highest Score: {highestScore}</Text>
              <Text style={styles.highScoreText}>Score: {score}</Text>
               <Text style={styles.difficultyText}>Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={handleContinue}
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
            <Text style={styles.difficultyText}>Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
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
  difficultyText:{
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    marginBottom: 20,
  },
  heartPowerupImage: {
    width: 40,
    height: 40,
    tintColor: '#ff9a9e',
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