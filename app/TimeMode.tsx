import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image, TouchableWithoutFeedback, Vibration} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Cloud from './Cloud';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TimeModeDifficultyLevel = 'easy' | 'moderate' | 'hard';

export type RootStackParamList = {
  MainMenu: undefined;
  TimeMode: { difficulty: TimeModeDifficultyLevel };
  SurvivalMode: undefined;
  Splash: undefined;
};
interface TimeModeProps {
  sound: Audio.Sound | null;
  wrongSound: Audio.Sound | null;
}
type TimeModeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TimeMode'>;
type TimeModeRouteProp = RouteProp<RootStackParamList, 'TimeMode'>;

interface BalloonProps {
  number: number;
  onPop: (number: number, isWrong: boolean) => void;
  position: { x: number; y: number };
  speed: number;
  currentTarget: number | null;
}

interface TimeBonusProps {
  seconds: number;
  position: { x: number; y: number };
  onCollect: (seconds: number) => void;
  speed: number;
}

const TimeBonus: React.FC<TimeBonusProps> = ({ seconds, position, onCollect, speed }) => {
  const fallAnim = useRef(new Animated.Value(position.y)).current;

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: height + 100,
      duration: 4000 / speed,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.x,
        transform: [{ translateY: fallAnim }],
        zIndex: 9,
      }}
    >
      <TouchableOpacity onPress={() => onCollect(seconds)}>
        <View style={styles.timeBonus}>
          <Text style={styles.timeBonusText}>+3s</Text> 
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const Balloon: React.FC<BalloonProps> = ({ 
  number, 
  onPop, 
  position, 
  speed, 
  currentTarget 
}) => {
  const fallAnim = useRef(new Animated.Value(position.y)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bombAnim = useRef(new Animated.Value(0)).current;
  
  const [showBomb, setShowBomb] = useState(false);
  
  const balloonColors = ['#FF4081'];
  const randomColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: height + 100,
      duration: (5000 + Math.random() * 2000) / speed,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    const isWrongBalloon = currentTarget !== null && number !== currentTarget;

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
        onPop(number, true);
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
        onPop(number, false);
      });
    }
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.x,
        transform: [{ translateY: fallAnim }],
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
                <Text style={styles.balloonText}>{number}</Text>
              </View>
              <View style={styles.balloonString} />
            </>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const TimeMode = () => {
    const navigation = useNavigation<TimeModeNavigationProp>();
    const route = useRoute<TimeModeRouteProp>();
    
    const { difficulty = 'easy' } = route.params || {};
    
    const easySpeed = 1;
    const moderateSpeed = 1.3;
    const hardSpeed = 1.5;
  
    const speedMultiplier = difficulty === 'easy' ? easySpeed : 
                            difficulty === 'moderate' ? moderateSpeed : 
                            difficulty === 'hard' ? hardSpeed : easySpeed;
    
    const [sound, setSound] = useState<Audio.Sound>();
    const [shouldVibrate, setShouldVibrate] = useState(false);
    const vibrationInterval = useRef<NodeJS.Timeout | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [countdown, setCountdown] = useState<string | null>(null);
    const [problem, setProblem] = useState('Press Play to Start');
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [balloons, setBalloons] = useState<Array<{
      id: string;
      number: number;
      position: { x: number; y: number };
    }>>([]);
    const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
    const [problemLevel, setProblemLevel] = useState(1);
    const [currentTarget, setCurrentTarget] = useState<number | null>(null);
    const countdownScale = useRef(new Animated.Value(1)).current;
    const countdownRef = useRef(0);
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);
    const gameTimer = useRef<number | null>(null);
    const balloonInterval = useRef<number | null>(null);
    const timeLeftRef = useRef(60);
  const vibrationActive = useRef(false);
const [processingGameEnd, setProcessingGameEnd] = useState(false);
const pendingScoreUpdates = useRef(0);
  const countdownValues = ['3', '2', '1', 'GO!'];
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  });

  const [timeBonuses, setTimeBonuses] = useState<Array<{
      id: string;
      seconds: number;
      position: { x: number; y: number };
    }>>([]);
  
  const getHighScoreKey = (difficultyLevel: TimeModeDifficultyLevel) => `@timeModeHighScore_${difficultyLevel}`;
  const [highestScore, setHighestScore] = useState(0);

  const handleReplay = () => {
    setGameOver(false);
    setScore(0);
    setTimeLeft(60);
    setCountdown(null);
    setProblemLevel(1);
    setProblem('Press Play to Start');
    setBalloons([]);
    setTimeBonuses([]);
    setCurrentTarget(null);
    setIsPlaying(true);
    setIsPaused(false);
    startGame();
  };
const saveScore = async (mode: string, difficulty: string, score: number) => {
  try {
    console.log(`Attempting to save score: ${score} for ${mode} ${difficulty}`);
    
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
    console.log('Score saved successfully:', scoreEntry);
    
    const verify = await AsyncStorage.getItem('@scoreHistory');
    console.log('Current score history:', verify);
  } catch (e) {
    console.error('Failed to save score history:', e);
  }
};
  useEffect(() => {
    timeLeftRef.current = timeLeft;
    
    if (timeLeft <= 10 && isPlaying && !isPaused && !gameOver) {
      setShouldVibrate(true);
    } else {
      setShouldVibrate(false);
    }
  }, [timeLeft, isPlaying, isPaused, gameOver]);
  
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const scoreKey = getHighScoreKey(difficulty);
        const savedScore = await AsyncStorage.getItem(scoreKey);
        if (savedScore !== null) {
          const parsedScore = parseInt(savedScore, 10);
          if (!isNaN(parsedScore)) {
            setHighestScore(parsedScore);
          }
        }
      } catch (e) {
        console.error('Failed to load high score:', e);
      }
    };
    
    loadHighScore();
  }, [difficulty]);
  
  useEffect(() => {
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
      Vibration.cancel();
      vibrationActive.current = false;
    }

    if (shouldVibrate && isPlaying && !isPaused && !gameOver) {
      Vibration.vibrate(500);
      vibrationActive.current = true;
      
      vibrationInterval.current = setInterval(() => {
        if (timeLeftRef.current <= 10 && isPlaying && !isPaused && !gameOver) {
          Vibration.vibrate(500);
        } else {
          if (vibrationInterval.current) {
            clearInterval(vibrationInterval.current);
            vibrationInterval.current = null;
            Vibration.cancel();
            vibrationActive.current = false;
          }
        }
      }, 1500) as unknown as NodeJS.Timeout;
    }

    return () => {
      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
        Vibration.cancel();
        vibrationActive.current = false;
      }
    };
  }, [shouldVibrate, isPlaying, isPaused, gameOver]);

  
  const togglePause = () => {
    if (!isPlaying) return;
    
    setIsPaused(prev => {
      if (!prev) {
        if (gameTimer.current) clearInterval(gameTimer.current);
        if (balloonInterval.current) clearInterval(balloonInterval.current);
        if (vibrationInterval.current) {
          clearInterval(vibrationInterval.current);
          vibrationInterval.current = null;
          Vibration.cancel();
          vibrationActive.current = false;
        }
      } else {
        startBalloons();
        gameTimer.current = window.setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
        if (timeLeftRef.current <= 10) {
          setShouldVibrate(true);
        }
      }
      return !prev;
    });
  };
  const handleContinue = () => {
    setIsPaused(false);
    
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          stopGame(true);
          return 0;
        }
        
        if (newTime === 51 || newTime === 41) {
          setProblemLevel(2);
          setProblem(generateProblem(2, newTime));
        } else if (newTime === 31) {
          setProblemLevel(3);
          setProblem(generateProblem(3, newTime));
        } else if (newTime === 21 || newTime === 11) {
          setProblemLevel(4);
          setProblem(generateProblem(4, newTime));
        }
        
        return newTime;
      });
    }, 1000);
    
    startBalloons();
  };

  const getProblemLevel = (time: number): number => {
    if (time > 50) return 1;
    if (time > 30) return 2;
    if (time > 20) return 3;
    return 4;
  };

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
  
  const generateProblem = (level: number, time: number): string => {
    const timestamp = new Date().getTime();
    const randomSeed = Math.floor(Math.random() * 1000) + timestamp % 100;
    
    const a = Math.floor(Math.random() * 4) + 1;
    const b = Math.floor(Math.random() * 4) + 1;

    if (level === 1) {
      const target = Math.floor(Math.random() * 9) + 1;
      setCurrentTarget(target);
      return `Tap number ${target}`;
    }

    if (level === 2) {
      const sum = a + b;
      setCurrentTarget(sum);
      return `${a} + ${b} = ?`;
    }

    if (level === 3) {
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      setCurrentTarget(larger - smaller);
      return `${larger} - ${smaller} = ?`;
    }

    if (level === 4) {
      if (time > 11) {
        const x = Math.floor(Math.random() * 3) + 1;
        const y = Math.floor(Math.random() * 3) + 1;
        setCurrentTarget(x * y);
        return `${x} × ${y} = ?`;
      } else {
        const y = Math.floor(Math.random() * 3) + 1;
        const product = y * (Math.floor(Math.random() * 3) + 1);
        setCurrentTarget(product / y);
        return `${product} ÷ ${y} = ?`;
      }
    }
    return "Pop the balloons!";
  };
  
  const generateBalloonNumber = (level: number): number => {
    if (currentTarget !== null && Math.random() < 0.6) {
      return currentTarget;
    }
    
    return Math.floor(Math.random() * 10);
  };
  
  useEffect(() => {
    if (balloons.length > 0) {
      console.log("New Balloons:", balloons.map(b => b.number));
    }
  }, [balloons]);
    
  const startBalloons = () => {
    if (balloonInterval.current) clearInterval(balloonInterval.current);
  
    const intervalTime = 1000 / (speedMultiplier * 0.8);
  
    balloonInterval.current = setInterval(() => {
      const newBalloons: Array<{
        id: string;
        number: number;
        position: { x: number; y: number };
      }> = [];
      const count = 2 + Math.floor(Math.random() * 2);
  
      for (let i = 0; i < count; i++) {
        newBalloons.push({
          id: Math.random().toString(36).substr(2, 9),
          number: generateBalloonNumber(problemLevel),
          position: { x: Math.random() * (width - 60), y: -100 },
        });
      }
      
      const timeBonusProbability = difficulty === 'hard' ? 0.2 : 
                                  difficulty === 'moderate' ? 0.3 : 0.4;
                                  
      if (Math.random() < timeBonusProbability) {
        setTimeBonuses(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          seconds: 3,
          position: { x: Math.random() * (width - 60), y: -100 }
        }]);
      }
  
      setBalloons(prev => [...prev, ...newBalloons]);
    }, intervalTime);
  };
  
  const handleTimeBonus = (seconds: number) => {
    setTimeLeft(prev => {
      const newTime = prev + seconds;
      if (newTime > 10) {
        setShouldVibrate(false);
      }
      return newTime;
    });
    setTimeBonuses(prev => prev.filter(b => b.seconds !== seconds));
  };
  
  const stopBalloons = () => {
    if (balloonInterval.current) clearInterval(balloonInterval.current);
    setBalloons([]);
  };
const scoreRef = useRef(0);
useEffect(() => {
  scoreRef.current = score;
}, [score]);
const handlePop = async (balloonNumber: number, isWrongBalloon: boolean): Promise<void> => {
  if (processingGameEnd) return;

  try {
    if (isWrongBalloon) {
      if (wrongSound) {
        await wrongSound.replayAsync();
      }
    } else {
      if (sound) {
        await sound.replayAsync();
      }
    }
  } catch (error) {
    console.log("Error playing sound:", error);
  }

  if (currentTarget !== null) {
    if (!isWrongBalloon) {
      pendingScoreUpdates.current += 1;
      
      let points = 1;
      if (problemLevel === 2) points = 3;
      else if (problemLevel === 3) points = 5;
      else if (problemLevel === 4) points = 10;
      
      setScore(prev => {
        const newScore = prev + points;
        console.log('Updating score:', newScore);
        
        scoreRef.current = newScore;
        
        setTimeout(() => {
          pendingScoreUpdates.current -= 1;
          console.log(`Completed score update, remaining updates: ${pendingScoreUpdates.current}`);
        }, 10);
        
        return newScore;
      });
    } 
  }
};
  const triggerCountdownPop = () => {
    countdownScale.setValue(0.8);
    Animated.spring(countdownScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
  };

  const startCountdown = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    countdownRef.current = 0;
  
    const runCountdown = () => {
      if (countdownRef.current < countdownValues.length) {
        setCountdown(countdownValues[countdownRef.current]);
        triggerCountdownPop();
        countdownRef.current += 1;
        setTimeout(runCountdown, 1000);
      } else {
        setCountdown(null);
        startGame();
      }
    };
  
    runCountdown();
  };
  
  const startGame = () => {
    if (gameTimer.current) clearInterval(gameTimer.current);
    if (balloonInterval.current) clearInterval(balloonInterval.current);
  
    const initialLevel = getProblemLevel(60);
    setProblemLevel(initialLevel);
    setProblem(generateProblem(initialLevel, 60));
    
    setTimeLeft(60);
    timeLeftRef.current = 60;
    
    setShouldVibrate(false);
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
      Vibration.cancel();
      vibrationActive.current = false;
    }
  
    startBalloons();
  
    gameTimer.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const updatedTime = prevTime - 1;
        timeLeftRef.current = updatedTime;
        
        if (updatedTime <= 10 && isPlaying && !isPaused && !gameOver) {
          if (!vibrationActive.current) {
            setShouldVibrate(true);
          }
        } else {
          if (vibrationActive.current) {
            setShouldVibrate(false);
          }
        }
    
        if (updatedTime <= 0) {
          setShouldVibrate(false);
          stopGame(true);
          return 0;
        }
        
        if (updatedTime === 51 || updatedTime === 41) {
          setProblemLevel(2);
          setProblem(generateProblem(2, updatedTime));
        } 
        else if (updatedTime === 31) {
          setProblemLevel(3);
          setProblem(generateProblem(3, updatedTime));
        }
        else if (updatedTime === 21 || updatedTime === 11) {
          setProblemLevel(4);
          setProblem(generateProblem(4, updatedTime));
        }
  
        return updatedTime;
      });
    }, 1000);
  };

  
const stopGame = async (isTimeUp = true) => {
  if (processingGameEnd) return;
    
  if (gameTimer.current) clearInterval(gameTimer.current);
  if (balloonInterval.current) clearInterval(balloonInterval.current);
  
  setShouldVibrate(false);
  if (vibrationInterval.current) {
    clearInterval(vibrationInterval.current);
    vibrationInterval.current = null;
    Vibration.cancel();
    vibrationActive.current = false;
  }

  setTimeBonuses([]);

  if (isTimeUp) {
    setProcessingGameEnd(true);
    
    console.log(`Game ending with processing delay, current score: ${scoreRef.current}, pending updates: ${pendingScoreUpdates.current}`);
    
    setTimeout(async () => {
      const finalScore = scoreRef.current;
      console.log(`Final score confirmed: ${finalScore}`);
      
      await saveScore('Time Mode', difficulty, finalScore);
      
      if (finalScore > highestScore) {
        try {
          const scoreKey = getHighScoreKey(difficulty);
          await AsyncStorage.setItem(scoreKey, finalScore.toString());
          setHighestScore(finalScore);
        } catch (e) {
          console.error('Failed to save high score:', e);
        }
      }
      
      setGameOver(true);
      setIsPlaying(false);
      setProcessingGameEnd(false);
    }, 500);
  } else {
    setIsPlaying(false);
    setTimeLeft(60);
    timeLeftRef.current = 60;
    setScore(0);
    scoreRef.current = 0;
    setCountdown(null);
    setProblemLevel(1);
    setBalloons([]);
    setCurrentTarget(null);
  }
};


  useEffect(() => {
    const updateHighestScore = async () => {
      if (score > highestScore) {
        setHighestScore(score);
        try {
          const scoreKey = getHighScoreKey(difficulty);
          await AsyncStorage.setItem(scoreKey, score.toString());
        } catch (e) {
          console.error('Failed to save high score:', e);
        }
      }
    };
    
    if (gameOver) {
      updateHighestScore();
    }
  }, [gameOver, score, highestScore, difficulty]);
  
const handlePlayPress = () => {
  if (!isPlaying) {
    setIsPlaying(true);
    startCountdown();
  } else {
    stopGame(false);
  }
};
const handleImmediateReplay = async () => {
  await stopGame(false);
  
  setGameOver(false);
  setScore(0);
  setTimeLeft(60);
  setProblemLevel(1);
  setBalloons([]);
  setTimeBonuses([]);
  setCurrentTarget(null);
  
  setIsPlaying(true);
  setIsPaused(false);
  setCountdown('3');
  
  let count = 3;
  const replayCountdown = setInterval(() => {
    count--;
    if (count > 0) {
      setCountdown(count.toString());
      triggerCountdownPop();
    } else {
      setCountdown('GO!');
      setTimeout(() => {
        setCountdown(null);
        startGame();
      }, 700);
      clearInterval(replayCountdown);
    }
  }, 1000);
};
  const startGameTimer = () => {
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          stopGame(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (gameTimer.current) clearInterval(gameTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (balloonInterval.current) clearInterval(balloonInterval.current);
    };
  }, []);

  return (
    <LinearGradient colors={['#a1c4fd', '#c2e9fb']} style={styles.container}>
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
          <View style={styles.iconWrapper}>
            <Image
              source={require('../assets/images/timer.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
        </View>

        <Text style={styles.mathProblem}>
          {countdown !== null ? countdown : problem}
        </Text>

        <View style={styles.scoreRow}>
          <View style={styles.line} />
          <View style={styles.circle}>
            <Text style={styles.circleText}>{score}</Text>
          </View>
          <View style={styles.line} />
        </View>
      </View>

      {balloons.map((balloon) => (
  <Balloon
    key={balloon.id}
    number={balloon.number}
    onPop={handlePop}
    position={balloon.position}
    speed={speedMultiplier}
    currentTarget={currentTarget}
  />
))}

      {timeBonuses.map((bonus) => (
        <TimeBonus
          key={bonus.id}
          seconds={bonus.seconds}
          position={bonus.position}
          onCollect={handleTimeBonus}
          speed={speedMultiplier}
        />
      ))}

      <Cloud style={styles.cloud1} />
      <Cloud style={styles.cloud2} />

      <TouchableOpacity 
        style={styles.play} 
        onPress={() => {
          if (isPlaying) {
            togglePause();
          } else {
            handlePlayPress();
          }
        }}
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
      
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Animated.Text
            style={[
              styles.countdownText,
              { transform: [{ scale: countdownScale }] },
            ]}>
            {countdown}
          </Animated.Text>
        </View>
      )}

      {isPaused && (
        <TouchableWithoutFeedback onPress={handleContinue}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Image 
                source={require('../assets/images/Math_Pop_Logo_Design-removebg-preview.png')} 
                style={styles.logo}
              />
              
              <Text style={styles.highScoreText}>High Score: {highestScore}</Text>
              <Text style={styles.highScoreText}>Score: {score}</Text>
              <Text style={styles.difficultyText}>Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
              
              <View style={styles.buttonRow}>
                {/* Continue Button */}
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={handleContinue}
                >
                  <Image
                    source={require('../assets/images/play-button (2).png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
                
                {/* Replay Button */}
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    setIsPaused(false);
                    handleImmediateReplay();
                  }}
                >
                  <Image
                    source={require('../assets/images/reload.png')}
                    style={styles.buttonIcon}
                  />
                </TouchableOpacity>
                
                {/* Home Button */}
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    setIsPaused(false);
                    navigation.goBack();
                  }}
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
                onPress={() => {
                  setGameOver(false);
                  handleImmediateReplay();
                }}
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
  timeBonus: {
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 2,
    borderColor: 'white',
  },
  modalButtonContainer1: {
    width: '100%',
    alignItems: 'center',
  },
  modalButton1: {
    width: '80%',
    marginVertical: 10,
  },
  timeBonusText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  highScore: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#000',
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
  balloon: {
    position: 'absolute',
    width: 60,
    height: 90,
    alignItems: 'center',
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
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    alignSelf: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  countdownText: {
    fontSize: 100,
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  play: {
    backgroundColor: '#a1c4fd',
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
  timerText: {
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
  difficultyText:{
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    marginBottom: 20,
  },
});

export default TimeMode;
