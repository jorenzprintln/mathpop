import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image, TouchableWithoutFeedback, Vibration  } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Cloud from './Cloud';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');
import { Audio } from 'expo-av';
interface BalloonProps {
  number: number;
  onPop: (number: number) => void;  // Updated interface
  position: { x: number; y: number };
}
interface TimeBonusProps {
  seconds: number;
  position: { x: number; y: number };
  onCollect: (seconds: number) => void;
}
const TimeBonus: React.FC<TimeBonusProps> = ({ seconds, position, onCollect }) => {
  const fallAnim = useRef(new Animated.Value(position.y)).current;

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: height + 100,
      duration: 4000 + Math.random() * 2000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.x,
        transform: [{ translateY: fallAnim }],
        zIndex: 9, // Just below balloons
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

const Balloon: React.FC<BalloonProps> = ({ number, onPop, position }) => {
  const fallAnim = useRef(new Animated.Value(position.y)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Balloon colors array from TimeMode theme
  const balloonColors = ['#FF4081'];
  const randomColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: height + 100,
      duration: 5000 + Math.random() * 2000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0, // Shrink to nothing when popped
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      onPop(number); // Pass the balloon number when popped
    });
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
        <Animated.View
          style={[
            styles.balloonInner,
            {
              backgroundColor: randomColor,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.balloonText}>{number}</Text>
        </Animated.View>
        <View style={styles.balloonString} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const TimeMode = ({navigation}: any) => {
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
  const [problemLevel, setProblemLevel] = useState(1);
  const [currentTarget, setCurrentTarget] = useState<number | null>(null);
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef(0);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const gameTimer = useRef<NodeJS.Timeout | null>(null);
  const balloonInterval = useRef<NodeJS.Timeout | null>(null);

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
  
    const TIME_MODE_HIGH_SCORE_KEY = '@timeModeHighScore';
    const [highestScore, setHighestScore] = useState(0);

  const handleReplay = () => {
    // Close game over modal
    setGameOver(false);
    
    // Reset game state without stopping
    setScore(0);
    setTimeLeft(60);
    setCountdown(null);
    setProblemLevel(1);
    setProblem('Press Play to Start');
    setBalloons([]);
    setTimeBonuses([]);
    setCurrentTarget(null);
    
    // Set to playing state immediately (will show pause button)
    setIsPlaying(true);
    setIsPaused(false);
    
    // Start game immediately (no countdown)
    startGame();
  };
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem(TIME_MODE_HIGH_SCORE_KEY);
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
  }, []);
  
// Vibration effect
useEffect(() => {
  if (shouldVibrate) {
    // Vibrate in a pattern (vibrate for 500ms, pause for 500ms)
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

  const togglePause = () => {
    if (!isPlaying) return;
    
    setIsPaused(prev => {
      if (!prev) {
        // Pausing the game
        if (gameTimer.current) clearInterval(gameTimer.current);
        if (balloonInterval.current) clearInterval(balloonInterval.current);
      } else {
        // Resuming the game
        startBalloons();
        gameTimer.current = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      }
      return !prev;
    });
  };

  const handleContinue = () => {
    setIsPaused(false);
    
    // Restart the game timer
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          stopGame(true);
          return 0;
        }
        
        // Handle level transitions
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
    
    // Restart balloon generation
    startBalloons();
  };

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem(TIME_MODE_HIGH_SCORE_KEY);
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
  }, []);
  const getProblemLevel = (time: number): number => {
    if (time > 50) return 1;  // Level 1: 1-digit numbers
    if (time > 30) return 2;  // Level 2: 1-digit problems (51s-31s)
    if (time > 20) return 3;  // Level 3: 2-digit problems (31s-21s)
    return 4;                 // Level 4: 1-digit problems (21s-0s)
  };

  const loadSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/audio/pop.mp3') // Make sure you have this sound file
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
  
  const generateProblem = (level: number, time: number): string => {
    // For all levels, only use numbers that produce 1-digit answers
    const a = Math.floor(Math.random() * 4) + 1; // 1-4 (to keep sums ≤9)
    const b = Math.floor(Math.random() * 4) + 1; // 1-4
  
    if (level === 1) {
      setCurrentTarget(a);
      return `Tap all numbers equal to ${a}`;
    }
  
    if (level === 2) {
      const sum = a + b;
      setCurrentTarget(sum);
      return `${a} + ${b} = ?`;
    }
  
    if (level === 3) {
      // For subtraction to keep answer positive and 1-digit
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      setCurrentTarget(larger - smaller);
      return `${larger} - ${smaller} = ?`;
    }
  
    if (level === 4) {
      if (time > 10) {
        // Multiplication with 1-digit results (1×1 to 3×3)
        const x = Math.floor(Math.random() * 3) + 1;
        const y = Math.floor(Math.random() * 3) + 1;
        setCurrentTarget(x * y);
        return `${x} × ${y} = ?`;
      } else {
        // Division with exact results (using multiplication facts)
        const y = Math.floor(Math.random() * 3) + 1;
        const x = y * (Math.floor(Math.random() * 3) + 1);
        setCurrentTarget(y);
        return `${x} ÷ ${y} = ?`;
      }
    }
    return "Pop the balloons!";
  };
  
  const generateBalloonNumber = (level: number): number => {
    // 50% chance to be the correct answer (if exists)
    if (currentTarget !== null && Math.random() < 0.6) {
      return currentTarget;
    }
    
    // Always generate 1-digit numbers (0-9)
    return Math.floor(Math.random() * 10);
  };
  
  useEffect(() => {
    if (balloons.length > 0) {
      console.log("New Balloons:", balloons.map(b => b.number));
    }
  }, [balloons]);
    
  const startBalloons = () => {
    if (balloonInterval.current) clearInterval(balloonInterval.current);
  
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
      if (Math.random() < 0.2) { // 30% chance
        setTimeBonuses(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          seconds: 3, // Fixed +5 seconds
          position: { x: Math.random() * (width - 60), y: -100 }
        }]);
      }
  
      setBalloons(prev => [...prev, ...newBalloons]);
    }, 1000);
  };
  const handleTimeBonus = (seconds: number) => {
    setTimeLeft(prev => {
      const newTime = prev + seconds;
      // Stop vibration if time goes above 10
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

  const handlePop = async (balloonNumber: number): Promise<void> => {
    try {
      if (sound) {
        await sound.replayAsync(); // Play the pop sound
      }
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  
    if (currentTarget !== null) {
      if (balloonNumber === currentTarget) {
        let points = 1;
        if (problemLevel === 2) points = 3;
        else if (problemLevel === 3) points = 5;
        else if (problemLevel === 4) points = 10;
        setScore(prev => prev + points);
      } else {
        setScore(prev => Math.max(0, prev - 1));
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
    // Clear any existing timers
    if (gameTimer.current) clearInterval(gameTimer.current);
    if (balloonInterval.current) clearInterval(balloonInterval.current);
  
    // Set initial problem
    const initialLevel = getProblemLevel(60);
    setProblemLevel(initialLevel);
    setProblem(generateProblem(initialLevel, 60));
  
    // Start game elements immediately (balloons will now fall continuously)
    startBalloons();
  
    // Start timer
    gameTimer.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const updatedTime = prevTime - 1;
        
        // Handle vibration at 10 seconds
        if (updatedTime <= 10) {
          setShouldVibrate(true);
        } else {
          setShouldVibrate(false);
        }
    
        if (updatedTime <= 0) {
          setShouldVibrate(false);
          stopGame(true);
          return 0;
        }
        // Update problems WITHOUT stopping balloons
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
// Find and replace the stopGame function with this enhanced version
const stopGame = async (isTimeUp = true) => {
  if (gameTimer.current) clearInterval(gameTimer.current);
  if (countdownInterval.current) clearInterval(countdownInterval.current);
  if (balloonInterval.current) clearInterval(balloonInterval.current);
  
  setShouldVibrate(false);
  setTimeBonuses([]);

  if (isTimeUp) {
    setGameOver(true);
  } else {
    // Reset game (manual stop)
    setIsPlaying(false);
    setTimeLeft(60);
    setScore(0);
    setCountdown(null);
    setProblemLevel(1);
    setBalloons([]);
    setCurrentTarget(null);
  }
};

// Also enhance the loadHighScore function in the useEffect
// Add this useEffect near the beginning of the component
useEffect(() => {
  const loadHighScore = async () => {
    try {
      const savedScore = await AsyncStorage.getItem(TIME_MODE_HIGH_SCORE_KEY);
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
}, []);

useEffect(() => {
  const updateHighestScore = async () => {
    if (score > highestScore) {
      setHighestScore(score);
      try {
        await AsyncStorage.setItem(TIME_MODE_HIGH_SCORE_KEY, score.toString());
      } catch (e) {
        console.error('Failed to save high score:', e);
      }
    }
  };
  
  if (gameOver) {
    updateHighestScore();
  }
}, [gameOver, score, highestScore]);
  const handlePlayPress = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      startCountdown();
    } else {
      stopGame();
    }
  };

  const handleImmediateReplay = () => {
    // Reset game states
    setScore(0);
    setTimeLeft(60);
    setProblemLevel(1);
    setBalloons([]);
    setTimeBonuses([]);
    setCurrentTarget(null);
    
    // Set to playing state (shows pause button)
    setIsPlaying(true);
    setIsPaused(false);
  
    // Start 3-second countdown
    setCountdown('3');
    let count = 3;
    
    const replayCountdown = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count.toString());
        triggerCountdownPop(); // Add animation if desired
      } else {
        setCountdown('GO!');
        setTimeout(() => {
          setCountdown(null);
          // Start actual gameplay
          if (gameTimer.current) clearInterval(gameTimer.current);
          if (balloonInterval.current) clearInterval(balloonInterval.current);
          setProblem(generateProblem(1, 60));
          startBalloons();
          startGameTimer();
        }, 500);
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
        // Handle level transitions...
        return newTime;
      });
    }, 1000);
  };

  const home = () => {
    navigation.navigate('Home'); // Assuming you have a navigation prop
  };

  // Clean up intervals on unmount
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
        />
      ))}

{timeBonuses.map((bonus) => (
  <TimeBonus
    key={bonus.id}
    seconds={bonus.seconds}
    position={bonus.position}
    onCollect={handleTimeBonus}
  />
))}

      <Cloud style={styles.cloud1} />
      <Cloud style={styles.cloud2} />

      <TouchableOpacity 
  style={styles.play} 
  onPress={() => {
    if (isPlaying) {
      togglePause(); // Pause if currently playing
    } else {
      handlePlayPress(); // Show countdown if new game
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
        
        <View style={styles.buttonRow}>
          {/* Continue Button - Now properly using handleContinue */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleContinue}  // This is where we add the handler
          >
            <Image
              source={require('../assets/images/play-button (2).png')}
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
          
          {/* Other buttons remain the same */}
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
            onPress={() => {
              setIsPaused(false);
              home();
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
      <View style={styles.modalButtonContainer}>
      <TouchableOpacity 
        style={[styles.modalButton, styles.replayButton]}
        onPress={() => {
          setGameOver(false); // Close modal
          handleImmediateReplay(); // Use new replay function
        }}
      >
        <Text style={styles.buttonText}>Replay</Text>
      </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modalButton, styles.homeButton]}
          onPress={() => {
            setGameOver(false);
            setTimeLeft(60);
            setProblem('Press Play to Start');
            setScore(0);
            setCountdown(null);
            setProblemLevel(1);
            setBalloons([]);
            setCurrentTarget(null);
          }}
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
});

export default TimeMode;
