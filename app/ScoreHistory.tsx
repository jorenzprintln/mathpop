import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get("window");


import { Calendar } from 'react-native-calendars';

interface ScoreEntry {
  mode: string;
  difficulty: string;
  score: number;
  timestamp: string;
  isHighest?: boolean;
}

const ScoreHistory = () => {
  const navigation = useNavigation();
  const [scoreData, setScoreData] = useState<ScoreEntry[]>([]);
  const [filteredScores, setFilteredScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [datesWithScores, setDatesWithScores] = useState<{[key: string]: {marked: boolean, dotColor: string}}>({}); 

  useEffect(() => {
    const loadScores = async () => {
      try {
        const scoresJson = await AsyncStorage.getItem('@scoreHistory');
        if (scoresJson) {
          const scores = JSON.parse(scoresJson);
          
          const highestScores: {[key: string]: number} = {};
          scores.forEach((score: ScoreEntry) => {
            const key = `${score.mode}-${score.difficulty}`;
            if (!highestScores[key] || score.score > highestScores[key]) {
              highestScores[key] = score.score;
            }
          });
          
          const processedScores = scores.map((score: ScoreEntry) => {
            const key = `${score.mode}-${score.difficulty}`;
            return {
              ...score,
              isHighest: score.score === highestScores[key]
            };
          });
          

          processedScores.sort((a: ScoreEntry, b: ScoreEntry) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setScoreData(processedScores);
          setFilteredScores(processedScores);
          
          const dates: {[key: string]: {marked: boolean, dotColor: string}} = {};
            scores.forEach((score: ScoreEntry) => {
            const dateString: string = new Date(score.timestamp).toISOString().split('T')[0];
            dates[dateString] = {marked: true, dotColor: '#10ac84'};
            });
          setDatesWithScores(dates);
        }
      } catch (e) {
        console.error('Failed to load scores:', e);
      } finally {
        setLoading(false);
      }
    };

    loadScores();
  }, []);

  const filterScoresByDate = (date: string | null) => {
    if (!date) {
      setFilteredScores(scoreData);
      setSelectedDate(null);
      return;
    }

    const filtered = scoreData.filter(score => {
      const scoreDate = new Date(score.timestamp).toISOString().split('T')[0];
      return scoreDate === date;
    });

    setFilteredScores(filtered);
    setSelectedDate(date);
  };


  const groupedScores: {[key: string]: ScoreEntry[]} = {};
  filteredScores.forEach(score => {
    const date = new Date(score.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!groupedScores[date]) {
      groupedScores[date] = [];
    }
    groupedScores[date].push(score);
  });


  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const getDisplayDate = () => {
    if (!selectedDate) return "All Dates";
    
    return new Date(selectedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  const clearDateFilter = () => {
    filterScoresByDate(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading scores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../assets/images/left-arrow.png')} style={styles.back} />
        </TouchableOpacity>
        <Text style={styles.scores}>Score History</Text>
      </View>
      
      <View style={styles.dateFilterContainer}>
        <Text style={styles.dateFilterText}>
          {getDisplayDate()}
        </Text>
        {selectedDate && (
          <TouchableOpacity onPress={clearDateFilter} style={styles.clearFilterButton}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.calendarButton}>
          <Image source={require('../assets/images/calendar.png')} style={styles.calendarIcon} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <Calendar
              markedDates={{
                ...datesWithScores,
                ...(selectedDate ? {[selectedDate]: {selected: true, marked: datesWithScores[selectedDate]?.marked, selectedColor: '#10ac84'}} : {})
              }}
              onDayPress={(day) => {
                filterScoresByDate(day.dateString);
                setShowCalendar(false);
              }}
              theme={{
                todayTextColor: '#10ac84',
                selectedDayBackgroundColor: '#10ac84',
                arrowColor: '#10ac84',
              }}
            />
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView>
        {Object.entries(groupedScores).length > 0 ? (
          Object.entries(groupedScores).map(([date, scores]) => (
            <View key={date}>
              <Text style={styles.date}>{date}</Text>
              
              {scores.map((item, index) => {
                const backgroundImage = item.mode === "Time Mode" 
                  ? require('../assets/images/timer.png')
                  : require('../assets/images/heart.png');

                return (
                  <View
                    key={index}
                    style={[
                      styles.scoreCard,
                      { 
                        backgroundColor: item.mode === "Time Mode" ? "#3498db" : "#e74c3c",
                        marginBottom: index === scores.length - 1 ? 20 : 10,
                      },
                    ]}
                  >
                    {item.isHighest && (
                      <View style={styles.crownContainer}>
                        <Image
                          source={require('../assets/images/crown.png')} 
                          style={styles.crownImage}
                        />
                      </View>
                    )}

                    <Image
                      source={backgroundImage}
                      style={styles.backgroundImage}
                      resizeMode="contain"
                    />

                    <View style={styles.textContainer}>
                      <View style={styles.leftColumn}>
                        <Text style={styles.modeText} numberOfLines={1}>
                          {item.mode}
                        </Text>

                        <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
                      </View>

                      <View style={styles.centerColumn}>
                        <Text style={styles.difficultyText}>
                          {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                        </Text>
                      </View>

                      <View style={styles.rightColumn}>
                        <Text style={styles.scoreText}>{item.score}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {selectedDate 
                ? `No scores found for ${getDisplayDate()}`
                : "No scores yet. Play some games!"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  leftColumn: {
    justifyContent: "center",
    alignItems: "flex-start",
    width: "40%",
  },
  centerColumn: {
    justifyContent: "center",
    alignItems: "center",
    width: "30%",
  },
  rightColumn: {
    justifyContent: "center",
    alignItems: "flex-end",
    width: "30%",
  },
  crownContainer: {
    position: 'absolute',
    top: 2,
    right: 20,
    zIndex: 10,
  },
  crownImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: '#FFD700',
  },
  top: {
    backgroundColor: "#10ac84",
    height: 140,
    width: "100%",
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  back: {
    width: 30,
    height: 30,
  },
  scores: {
    fontSize: 35,
    color: "white",
    fontFamily: "Poppins-Bold",
    textAlign: "center",
  },
  date: {
    fontSize: 20,
    color: "black",
    fontFamily: "Poppins-Bold",
    marginLeft: 20,
    marginTop: 20,
  },
  scoreCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 15,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.15,
    borderRadius: 15,
  },
  textContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modeText: {
    fontSize: 15,
    color: "white",
    fontFamily: "Poppins-Bold",
    textAlign: "left",
    marginRight: 10,
  },
  difficultyText: {
    fontSize: 18,
    color: "white",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    opacity: 0.85,
  },
  scoreText: {
    fontSize: 28,
    color: "white",
    fontFamily: "Poppins-Bold",
  },
  timeText: {
    fontSize: 14,
    color: "white",
    fontFamily: "Poppins-Regular",
    marginTop: 2,
    opacity: 0.85,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateFilterText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    flex: 1,
  },
  clearFilterButton: {
    padding: 5,
  },
  clearFilterText: {
    fontSize: 14,
    color: '#10ac84',
    fontFamily: 'Poppins-Medium',
  },
  calendarButton: {
    marginLeft: 10,
  },
  calendarIcon: {
    width: 24,
    height: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#10ac84',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
});

export default ScoreHistory;