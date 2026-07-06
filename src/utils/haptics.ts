import * as Haptics from 'expo-haptics';

// 轻量触觉：用于 Tab 切换、视图切换、选择日期等轻交互
export const hapticSelect = (): void => {
  Haptics.selectionAsync().catch(() => {
    // 触觉反馈失败静默处理（部分 Android 设备不支持）
  });
};

// 轻冲击触觉：用于按钮按压反馈
export const hapticLight = (): void => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // 触觉反馈失败静默处理
  });
};

// 成功触觉：用于记录心情、导出导入成功等正向反馈
export const hapticSuccess = (): void => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
    // 触觉反馈失败静默处理
  });
};

// 失败触觉：用于操作失败、错误等负向反馈
export const hapticError = (): void => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
    // 触觉反馈失败静默处理
  });
};
