import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Linking, Alert } from 'react-native';
import { COLORS } from './src/constants';
import type { MoodLevel } from './src/types';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// 小组件交互监听（平台自动选择 .ios / .android / 通用）
import { setupWidgetInteractionListener, updateMoodWidget } from './src/widgets/MoodWidget';
import { initDatabase } from './src/database/moodDB';
import * as moodDB from './src/database/moodDB';

type TabKey = 'home' | 'analysis' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // 初始化数据库和小组件
  useEffect(() => {
    (async () => {
      await initDatabase();
      await updateMoodWidget();
    })();
  }, []);

  // 监听小组件交互
  useEffect(() => {
    const subscription = setupWidgetInteractionListener();
    return () => subscription.remove();
  }, []);

  // 处理 Deep Link（Android 小组件通过 URL Scheme 传递心情）
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // 格式：tapmood://record?mood=bad
      const match = url.match(/tapmood:\/\/record\?mood=(bad|okay|good)/);
      if (match) {
        const mood = match[1] as MoodLevel;
        await moodDB.recordMood(mood);
        await updateMoodWidget();
        setActiveTab('home');
        Alert.alert('已记录', `今天心情：${mood === 'bad' ? '差' : mood === 'okay' ? '中' : '好'}`);
      }
    };

    // 检查初始 URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // 监听后续 URL
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'analysis': return <AnalysisScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  const handleTabPress = (tab: string) => setActiveTab(tab as TabKey);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {renderScreen()}
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
