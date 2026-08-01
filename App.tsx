import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Linking, DeviceEventEmitter, Platform as RNPlatform, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS, MOOD_EVENTS } from './src/constants';
import type { MoodLevel } from './src/types';
import TabBar from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as moodDB from './src/database/moodDB';
import { applyNotificationSettings } from './src/utils/notification';
import OnboardingScreen from './src/screens/OnboardingScreen';

// 首次启动 Onboarding 标记的 AsyncStorage key
const ONBOARDED_KEY = 'hasOnboarded';

// 阻止原生 Splash 自动隐藏，待数据库初始化完成后手动 hideAsync 实现淡出
SplashScreen.preventAutoHideAsync().catch(() => {
  // preventAutoHideAsync 在某些环境下（如 Metro reload）可能已 hide，静默忽略
});

// 平台特定小组件模块：iOS 使用 MoodWidget.ios.tsx，Android 使用 MoodWidget.android.tsx
const widgetModule = RNPlatform.select({
  ios: () => require('./src/widgets/MoodWidget.ios'),
  android: () => require('./src/widgets/MoodWidget.android'),
  default: () => require('./src/widgets/MoodWidget'),
})();

const { setupWidgetInteractionListener, updateMoodWidget } = widgetModule as {
  setupWidgetInteractionListener: () => { remove: () => void };
  updateMoodWidget: () => Promise<void>;
};

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
  const [dbError, setDbError] = useState(false);
  // 已访问过的 tab 集合：首次切换时才挂载，之后保持挂载以保留状态
  const [visited, setVisited] = useState<Set<TabKey>>(new Set(['home']));
  // onboarding 状态：null = 加载中，false = 未引导，true = 已引导
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // appReady = 数据库初始化完成，可以隐藏 Splash
  const [appReady, setAppReady] = useState(false);

  // 启动时读 onboarding 标记
  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDED_KEY);
        setOnboarded(value === 'true');
      } catch {
        // 读取失败默认已 onboarded，避免卡死
        setOnboarded(true);
      }
    })();
  }, []);

  // Onboarding 完成回调：写入标记 + 进入主页
  const handleOnboardingDone = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      // 写入失败静默处理，但仍进入主页
    }
    setOnboarded(true);
  }, []);

  // 初始化数据库和小组件
  useEffect(() => {
    (async () => {
      try {
        await moodDB.initDatabase();
        // 恢复通知调度（重新调度下一次一次性通知）
        try {
          const settings = await moodDB.getNotificationSettings();
          await applyNotificationSettings(settings);
        } catch {
          // 恢复通知失败不影响主流程
        }
      } catch (e) {
        // 数据库初始化失败，显示错误界面
        setDbError(true);
      }
      try {
        await updateMoodWidget();
      } catch {
        // 小组件更新失败不影响主流程
      }
      // 数据库与小组件初始化完成，标记 appReady
      // hideAsync 触发原生 splash 隐藏，并在下方 effect 中执行 fadeMask 淡出
      setAppReady(true);
    })();
  }, []);

  // appReady 后隐藏原生 splash（原生隐藏自带渐变，无需 JS fadeMask 避免双层闪烁）
  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {
      // hideAsync 失败静默处理
    });
  }, [appReady]);

  // 通知被点击后重新调度下一次提醒（确保明天仍有通知）
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async () => {
      try {
        const settings = await moodDB.getNotificationSettings();
        await applyNotificationSettings(settings);
      } catch {
        // 重新调度失败静默
      }
    });
    return () => subscription.remove();
  }, []);

  // 监听小组件交互
  useEffect(() => {
    const subscription = setupWidgetInteractionListener();
    return () => subscription.remove();
  }, []);

  // 处理 Deep Link（Android 小组件通过 URL Scheme 传递心情）
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // 大小写不敏感匹配，兼容 Android intent 不同大小写
      const match = url.toLowerCase().match(/tapmood:\/\/record\?mood=(bad|okay|good)/);
      if (match) {
        const mood = match[1] as MoodLevel;
        setActiveTab('home');
        // 双重保障：emit 事件覆盖监听器已就绪场景；AsyncStorage 暂存兜底监听器未就绪场景
        DeviceEventEmitter.emit('recordMoodFromWidget', { mood });
        try {
          await AsyncStorage.setItem('pendingWidgetMood', mood);
        } catch {
          // 写入失败静默，emit 事件仍可能生效
        }
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

  // 切换到分析页时触发 focus 事件，通知 AnalysisScreen 刷新全局统计
  useEffect(() => {
    if (activeTab === 'analysis') {
      DeviceEventEmitter.emit(MOOD_EVENTS.ANALYSIS_FOCUS);
    }
  }, [activeTab]);

  const handleTabPress = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setVisited((prev) => prev.has(tab) ? prev : new Set(prev).add(tab));
    // 通知目标页滚动到顶部
    DeviceEventEmitter.emit(MOOD_EVENTS.TAB_FOCUS, { tab });
  }, []);

  // 加载中：onboarded 还没读到，显示极简 loading 避免闪烁
  if (onboarded === null) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, styles.loadingWrap]} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <Text style={styles.loadingText}>...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 未 onboarded：显示首次启动引导
  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <OnboardingScreen onDone={handleOnboardingDone} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 数据库初始化失败时显示错误界面
  if (dbError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>数据加载失败</Text>
            <Text style={styles.errorDesc}>请重启应用，如问题持续请联系开发者</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {/* 懒挂载 + display:none 保持已访问页面的状态 */}
        <View style={styles.screenContainer}>
          {visited.has('home') && (
            <View style={[styles.screenWrap, activeTab !== 'home' && styles.hidden]}>
              <HomeScreen />
            </View>
          )}
          {visited.has('analysis') && (
            <View style={[styles.screenWrap, activeTab !== 'analysis' && styles.hidden]}>
              <AnalysisScreen />
            </View>
          )}
          {visited.has('settings') && (
            <View style={[styles.screenWrap, activeTab !== 'settings' && styles.hidden]}>
              <SettingsScreen />
            </View>
          )}
        </View>
        <TabBar activeTab={activeTab} onTabPress={handleTabPress} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  screenWrap: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
});
