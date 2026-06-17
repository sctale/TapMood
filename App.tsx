import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from './src/constants';
import type { MoodLevel } from './src/types';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// 小组件交互监听（平台自动选择 .ios / .android / 通用）
import { setupWidgetInteractionListener, updateMoodWidget } from './src/widgets/MoodWidget';
import * as moodDB from './src/database/moodDB';

type TabKey = 'home' | 'analysis' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // 初始化数据库和小组件
  useEffect(() => {
    (async () => {
      try {
        await moodDB.initDatabase();
        await updateMoodWidget();
      } catch (e) {
        // 初始化失败时提示用户
        Alert.alert('初始化失败', '应用数据初始化失败，请重启应用');
      }
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
      try {
        // 格式：tapmood://record?mood=bad
        const match = url.match(/tapmood:\/\/record\?mood=(bad|okay|good)/);
        if (match) {
          const mood = match[1] as MoodLevel;
          await moodDB.recordMood(mood);
          await updateMoodWidget();
          setActiveTab('home');
          const moodLabel = mood === 'bad' ? '差' : mood === 'okay' ? '中' : '好';
          Alert.alert('已记录', `今天心情：${moodLabel}`);
        }
      } catch (e) {
        Alert.alert('记录失败', '请稍后重试');
      }
    };

    // 检查初始 URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    }).catch(() => {
      // 获取初始 URL 失败静默处理
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

  const handleTabPress = (tab: TabKey) => setActiveTab(tab);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
