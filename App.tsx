import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Linking, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { COLORS } from './src/constants';
import type { MoodLevel } from './src/types';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// 小组件交互监听（平台自动选择 .ios / .android / 通用）
import { setupWidgetInteractionListener, updateMoodWidget } from './src/widgets/MoodWidget';
import * as moodDB from './src/database/moodDB';

// 全局通知处理器：如果今天已记录心情，则不弹提醒
// 注意：此代码在模块顶层执行，数据库可能尚未初始化
// 需要防御性处理，避免 Android 启动时崩溃
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // 只对心情提醒通知做智能判断
      if (notification.request.content.data?.type === 'mood_reminder') {
        try {
          const todayMood = await moodDB.getTodayMood();
          if (todayMood) {
            // 今天已记录心情，静默跳过
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }
        } catch {
          // 数据库未初始化或查询失败，默认显示通知
        }
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
} catch {
  // Android 上 expo-notifications 原生模块可能尚未就绪，静默忽略
}

type TabKey = 'home' | 'analysis' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // 初始化数据库和小组件
  useEffect(() => {
    (async () => {
      try {
        await moodDB.initDatabase();
      } catch (e) {
        // 数据库初始化失败不崩溃，用户仍可使用基本功能
      }
      try {
        await updateMoodWidget();
      } catch {
        // 小组件更新失败不影响主流程
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
      const match = url.match(/tapmood:\/\/record\?mood=(bad|okay|good)/);
      if (match) {
        const mood = match[1] as MoodLevel;
        setActiveTab('home');
        // 通过全局事件发送，让 HomeScreen 的 useMood hook 处理
        DeviceEventEmitter.emit('recordMoodFromWidget', { mood });
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
