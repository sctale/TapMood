/**
 * Expo Config Plugin：自动注入 Android 桌面小组件原生代码
 *
 * 遵循 Android 12+ (API 31+) 小组件设计规范：
 * - 使用 targetCellWidth/Height 指定默认格子数
 * - 同时设置 minWidth/minHeight 兼容 Android 11 及以下
 * - 使用 minResizeWidth/Height + maxResizeWidth/Height 限制可调整范围
 * - 添加 previewLayout 实现 Android 12+ 选择器实时预览
 * - 使用系统标准圆角 (@android:dimen/system_app_widget_background_radius)
 * - 采用响应式布局 RemoteViews(Map<SizeF, RemoteViews>) 适配不同尺寸
 *
 * 尺寸标准（5x4 网格手机，来源：Android 官方文档）：
 *   1x1 = 57x102dp   2x1 = 130x102dp   3x1 = 203x102dp
 *   4x1 = 276x102dp   5x1 = 349x102dp
 *   公式：(73n - 16) x (118m - 16)
 */
const {
  withDangerousMod,
  withAndroidManifest,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// 通用 Java 工具方法
// ============================================================
const JAVA_UTILS = `
    private boolean isTodayMoodRecorded(Context context) {
        try {
            java.io.File file = new java.io.File(context.getFilesDir(), "widget_state.json");
            if (!file.exists()) return false;
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();
            org.json.JSONObject json = new org.json.JSONObject(sb.toString());
            String date = json.getString("date");
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(new java.util.Date());
            String mood = json.optString("mood", "");
            return today.equals(date) && !mood.isEmpty();
        } catch (Exception e) { return false; }
    }

    private int getBgAlphaLevel(Context context) {
        try {
            java.io.File file = new java.io.File(context.getFilesDir(), "widget_config.json");
            if (!file.exists()) return 3;
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();
            return new org.json.JSONObject(sb.toString()).optInt("bgAlpha", 3);
        } catch (Exception e) { return 3; }
    }

    private void applyBackground(Context context, RemoteViews views) {
        int level = getBgAlphaLevel(context);
        int[] bgResIds = { R.drawable.widget_bg_0, R.drawable.widget_bg_25, R.drawable.widget_bg_50, R.drawable.widget_bg_75, R.drawable.widget_bg_100 };
        if (level >= 0 && level < bgResIds.length) {
            views.setInt(R.id.widget_root, "setBackgroundResource", bgResIds[level]);
        }
    }
`;

// ============================================================
// 单个响应式小组件 Java（Android 12+ 最佳实践）
// 默认 4x1，可水平调整到 2x1~5x1
// Android 12+ 使用 RemoteViews(Map<SizeF, RemoteViews>) 响应式布局
// Android 11 及以下使用默认 4x1 布局
// ============================================================
const WIDGET_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.SizeF;
import android.widget.RemoteViews;
import android.widget.Toast;
import java.util.Map;
import android.util.ArrayMap;

public class MoodWidget extends AppWidgetProvider {
    private static final String ACTION_MOOD_BAD = "com.tapmood.app.MOOD_BAD";
    private static final String ACTION_MOOD_OKAY = "com.tapmood.app.MOOD_OKAY";
    private static final String ACTION_MOOD_GOOD = "com.tapmood.app.MOOD_GOOD";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+：响应式布局，根据尺寸自动切换
                RemoteViews wideView = new RemoteViews(context.getPackageName(), R.layout.mood_widget_4x1);
                setupWideViewClicks(context, wideView);
                applyBackground(context, wideView);

                RemoteViews narrowView = new RemoteViews(context.getPackageName(), R.layout.mood_widget_2x1);
                setupNarrowViewClicks(context, narrowView);
                applyBackground(context, narrowView);

                Map<SizeF, RemoteViews> viewMapping = new ArrayMap<>();
                viewMapping.put(new SizeF(130f, 102f), narrowView);
                viewMapping.put(new SizeF(276f, 102f), wideView);
                views = new RemoteViews(viewMapping);
            } else {
                // Android 11 及以下：使用 4x1 默认布局
                views = new RemoteViews(context.getPackageName(), R.layout.mood_widget_4x1);
                setupWideViewClicks(context, views);
                applyBackground(context, views);
            }
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private void setupWideViewClicks(Context context, RemoteViews views) {
        views.setOnClickPendingIntent(R.id.btn_bad, getMoodPendingIntent(context, ACTION_MOOD_BAD, 1));
        views.setOnClickPendingIntent(R.id.btn_okay, getMoodPendingIntent(context, ACTION_MOOD_OKAY, 2));
        views.setOnClickPendingIntent(R.id.btn_good, getMoodPendingIntent(context, ACTION_MOOD_GOOD, 3));
        Intent openApp = new Intent(context, MainActivity.class);
        views.setOnClickPendingIntent(R.id.widget_title,
            PendingIntent.getActivity(context, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }

    private void setupNarrowViewClicks(Context context, RemoteViews views) {
        views.setOnClickPendingIntent(R.id.btn_bad, getMoodPendingIntent(context, ACTION_MOOD_BAD, 4));
        views.setOnClickPendingIntent(R.id.btn_okay, getMoodPendingIntent(context, ACTION_MOOD_OKAY, 5));
        views.setOnClickPendingIntent(R.id.btn_good, getMoodPendingIntent(context, ACTION_MOOD_GOOD, 6));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        String mood = null;
        if (ACTION_MOOD_BAD.equals(action)) mood = "bad";
        else if (ACTION_MOOD_OKAY.equals(action)) mood = "okay";
        else if (ACTION_MOOD_GOOD.equals(action)) mood = "good";
        if (mood != null) {
            if (isTodayMoodRecorded(context)) {
                Toast.makeText(context, "今天已记录心情", Toast.LENGTH_SHORT).show();
                Intent openApp = new Intent(context, MainActivity.class);
                openApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(openApp);
            } else {
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.setAction(Intent.ACTION_VIEW);
                launchIntent.setData(android.net.Uri.parse("tapmood://record?mood=" + mood));
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(launchIntent);
            }
        }
    }

    private PendingIntent getMoodPendingIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, MoodWidget.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
${JAVA_UTILS}}
`;

// ============================================================
// 4x1 宽版布局：标题 + 三个极简图标按钮
// ============================================================
const WIDGET_LAYOUT_4x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_bg_75"
    android:paddingStart="12dp"
    android:paddingEnd="12dp"
    android:paddingTop="8dp"
    android:paddingBottom="8dp"
    android:gravity="center_vertical">

    <TextView android:id="@+id/widget_title"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="一点心情" android:textSize="13sp" android:textColor="#666666"
        android:textStyle="bold" android:layout_marginEnd="12dp"
        android:maxLines="1" android:ellipsize="end" />

    <ImageView android:id="@+id/btn_bad" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_bad" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_bad" android:layout_margin="3dp"
        android:contentDescription="差" />

    <ImageView android:id="@+id/btn_okay" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_okay" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_okay" android:layout_margin="3dp"
        android:contentDescription="中" />

    <ImageView android:id="@+id/btn_good" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_good" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_good" android:layout_margin="3dp"
        android:contentDescription="好" />
</LinearLayout>`;

// ============================================================
// 2x1 窄版布局：三个极简图标按钮（紧凑）
// ============================================================
const WIDGET_LAYOUT_2x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_bg_75"
    android:paddingStart="8dp"
    android:paddingEnd="8dp"
    android:paddingTop="6dp"
    android:paddingBottom="6dp"
    android:gravity="center_vertical">

    <ImageView android:id="@+id/btn_bad" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_bad" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_bad" android:layout_margin="2dp"
        android:contentDescription="差" />

    <ImageView android:id="@+id/btn_okay" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_okay" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_okay" android:layout_margin="2dp"
        android:contentDescription="中" />

    <ImageView android:id="@+id/btn_good" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:src="@drawable/ic_mood_good" android:scaleType="centerInside"
        android:background="@drawable/widget_btn_good" android:layout_margin="2dp"
        android:contentDescription="好" />
</LinearLayout>`;

// ============================================================
// 小组件配置 XML（遵循 Android 12+ 尺寸标准）
// 单个响应式小组件：默认 4x1，可调整到 2x1~5x1
// ============================================================
const WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:label="@string/widget_label"
    android:description="@string/widget_description"
    android:initialLayout="@layout/mood_widget_4x1"
    android:previewLayout="@layout/mood_widget_4x1"
    android:minWidth="276dp" android:minHeight="40dp"
    android:minResizeWidth="130dp" android:minResizeHeight="40dp"
    android:maxResizeWidth="349dp" android:maxResizeHeight="180dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

// ============================================================
// 极简矢量图标 - 精致圆形 + 简笔表情
// 设计理念：柔和底色 + 精致描边 + 清晰表情
// 差：淡紫圆 + 圆点眼 + 下弯嘴
// 中：暖灰圆 + 圆点眼 + 直线嘴
// 好：薄荷圆 + 弯弯笑眼 + 上弯嘴
// ============================================================
const IC_MOOD_BAD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#EDE7F6"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#D1C4E9" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 圆点 -->
    <path android:pathData="M14.5,15.5m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#7E57C2"/>
    <!-- 右眼 - 圆点 -->
    <path android:pathData="M25.5,15.5m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#7E57C2"/>
    <!-- 下弯嘴 -->
    <path android:pathData="M14.5,27 Q20,22.5 25.5,27"
        android:strokeColor="#7E57C2" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

const IC_MOOD_OKAY = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#ECEFF1"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#CFD8DC" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 圆点 -->
    <path android:pathData="M14.5,16m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#78909C"/>
    <!-- 右眼 - 圆点 -->
    <path android:pathData="M25.5,16m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#78909C"/>
    <!-- 直线嘴 -->
    <path android:pathData="M15,25 L25,25"
        android:strokeColor="#78909C" android:strokeWidth="1.8"
        android:strokeLineCap="round"/>
</vector>`;

const IC_MOOD_GOOD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#E0F2F1"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#B2DFDB" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 弯弯笑眼 -->
    <path android:pathData="M12,17 Q14.5,13 17,17"
        android:strokeColor="#26A69A" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <!-- 右眼 - 弯弯笑眼 -->
    <path android:pathData="M23,17 Q25.5,13 28,17"
        android:strokeColor="#26A69A" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <!-- 上弯嘴 -->
    <path android:pathData="M14.5,24 Q20,30 25.5,24"
        android:strokeColor="#26A69A" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

// ============================================================
// 按钮背景 - 极简圆角矩形，带微妙色彩倾向
// ============================================================
const DRAWABLE_BTN_BAD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F3E5F5"/><corners android:radius="12dp"/></shape>`;
const DRAWABLE_BTN_OKAY = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#ECEFF1"/><corners android:radius="12dp"/></shape>`;
const DRAWABLE_BTN_GOOD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#E0F2F1"/><corners android:radius="12dp"/></shape>`;

// ============================================================
// 背景透明度等级（使用系统标准圆角 v31+，兼容旧版 20dp）
// ============================================================
const DRAWABLE_BG_0 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#00FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_25 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#40FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_50 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#80FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_75 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#BFFFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_100 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFFFFFFF"/><corners android:radius="20dp"/></shape>`;

// Android 12+ 系统标准圆角版本
const DRAWABLE_BG_0_V31 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#00FFFFFF"/><corners android:radius="@android:dimen/system_app_widget_background_radius"/></shape>`;
const DRAWABLE_BG_25_V31 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#40FFFFFF"/><corners android:radius="@android:dimen/system_app_widget_background_radius"/></shape>`;
const DRAWABLE_BG_50_V31 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#80FFFFFF"/><corners android:radius="@android:dimen/system_app_widget_background_radius"/></shape>`;
const DRAWABLE_BG_75_V31 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#BFFFFFFF"/><corners android:radius="@android:dimen/system_app_widget_background_radius"/></shape>`;
const DRAWABLE_BG_100_V31 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFFFFFFF"/><corners android:radius="@android:dimen/system_app_widget_background_radius"/></shape>`;

// ============================================================
const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?><resources>
<string name="widget_label">一点心情</string>
<string name="widget_description">快速记录今天的心情</string>
</resources>`;

// ============================================================
function writeFile(dir, filename, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
}

function withAndroidWidget(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];
    const existingReceivers = application.receiver || [];

    // 移除旧的两个 Provider（4x1 和 2x1），替换为单个响应式 Provider
    const filteredReceivers = existingReceivers.filter((r) => {
      const name = r.$['android:name'];
      return name !== '.MoodWidget4x1' && name !== '.MoodWidget2x1';
    });

    const hasWidget = filteredReceivers.some((r) => r.$['android:name'] === '.MoodWidget');

    const newReceivers = [...filteredReceivers];
    if (!hasWidget) {
      newReceivers.push({
        $: { 'android:name': '.MoodWidget', 'android:exported': 'true', 'android:label': '一点心情' },
        'intent-filter': [{ action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_BAD' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD' } },
        ]}],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/mood_widget_info' } }],
      });
    }
    application.receiver = newReceivers;
    return config;
  });

  config = withDangerousMod(config, ['android', async (config) => {
    const javaDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java/com/tapmood/app');
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');

    // Java 类
    writeFile(javaDir, 'MoodWidget.java', WIDGET_JAVA);

    // 布局
    writeFile(path.join(resDir, 'layout'), 'mood_widget_4x1.xml', WIDGET_LAYOUT_4x1);
    writeFile(path.join(resDir, 'layout'), 'mood_widget_2x1.xml', WIDGET_LAYOUT_2x1);

    // 小组件配置
    writeFile(path.join(resDir, 'xml'), 'mood_widget_info.xml', WIDGET_INFO);

    // 极简矢量图标
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_bad.xml', IC_MOOD_BAD);
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_okay.xml', IC_MOOD_OKAY);
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_good.xml', IC_MOOD_GOOD);

    // 按钮背景
    writeFile(path.join(resDir, 'drawable'), 'widget_btn_bad.xml', DRAWABLE_BTN_BAD);
    writeFile(path.join(resDir, 'drawable'), 'widget_btn_okay.xml', DRAWABLE_BTN_OKAY);
    writeFile(path.join(resDir, 'drawable'), 'widget_btn_good.xml', DRAWABLE_BTN_GOOD);

    // 背景透明度 - 默认版本（兼容旧版，固定 20dp 圆角）
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_0.xml', DRAWABLE_BG_0);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_25.xml', DRAWABLE_BG_25);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_50.xml', DRAWABLE_BG_50);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_75.xml', DRAWABLE_BG_75);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_100.xml', DRAWABLE_BG_100);

    // 背景透明度 - v31+ 版本（Android 12+ 系统标准圆角）
    writeFile(path.join(resDir, 'drawable-v31'), 'widget_bg_0.xml', DRAWABLE_BG_0_V31);
    writeFile(path.join(resDir, 'drawable-v31'), 'widget_bg_25.xml', DRAWABLE_BG_25_V31);
    writeFile(path.join(resDir, 'drawable-v31'), 'widget_bg_50.xml', DRAWABLE_BG_50_V31);
    writeFile(path.join(resDir, 'drawable-v31'), 'widget_bg_75.xml', DRAWABLE_BG_75_V31);
    writeFile(path.join(resDir, 'drawable-v31'), 'widget_bg_100.xml', DRAWABLE_BG_100_V31);

    // 字符串
    writeFile(path.join(resDir, 'values'), 'strings_widget.xml', STRINGS_XML);

    // 清理旧文件
    [
      path.join(resDir, 'layout', 'mood_widget.xml'),
      path.join(resDir, 'xml', 'mood_widget_info_4x1.xml'),
      path.join(resDir, 'xml', 'mood_widget_info_2x1.xml'),
      path.join(resDir, 'drawable', 'widget_dot.xml'),
      path.join(resDir, 'drawable', 'widget_background.xml'),
      path.join(javaDir, 'MoodWidgetProvider.java'),
      path.join(javaDir, 'MoodWidget4x1.java'),
      path.join(javaDir, 'MoodWidget2x1.java'),
    ].forEach((f) => { try { fs.unlinkSync(f); } catch {} });

    return config;
  }]);

  return config;
}

module.exports = withAndroidWidget;
