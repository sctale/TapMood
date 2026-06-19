/**
 * Expo Config Plugin：自动注入 Android 桌面小组件原生代码
 * 遵循 Android 12+ 小组件设计规范
 * 提供 4x1 和 2x1 两种尺寸，支持背景透明度调节
 *
 * 尺寸标准（5x4 网格手机）：
 *   1x1 = 57x102dp   2x1 = 130x102dp   4x1 = 276x102dp
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
// 4x1 宽版小组件 Java
// ============================================================
const WIDGET_4x1_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.Toast;

public class MoodWidget4x1 extends AppWidgetProvider {
    private static final String ACTION_MOOD_BAD = "com.tapmood.app.MOOD_BAD_4x1";
    private static final String ACTION_MOOD_OKAY = "com.tapmood.app.MOOD_OKAY_4x1";
    private static final String ACTION_MOOD_GOOD = "com.tapmood.app.MOOD_GOOD_4x1";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget_4x1);
            views.setOnClickPendingIntent(R.id.btn_bad, getMoodPendingIntent(context, ACTION_MOOD_BAD));
            views.setOnClickPendingIntent(R.id.btn_okay, getMoodPendingIntent(context, ACTION_MOOD_OKAY));
            views.setOnClickPendingIntent(R.id.btn_good, getMoodPendingIntent(context, ACTION_MOOD_GOOD));
            Intent openApp = new Intent(context, MainActivity.class);
            views.setOnClickPendingIntent(R.id.widget_title,
                PendingIntent.getActivity(context, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            applyBackground(context, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
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

    private PendingIntent getMoodPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MoodWidget4x1.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
${JAVA_UTILS}}
`;

// ============================================================
// 2x1 窄版小组件 Java
// ============================================================
const WIDGET_2x1_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.Toast;

public class MoodWidget2x1 extends AppWidgetProvider {
    private static final String ACTION_MOOD_BAD = "com.tapmood.app.MOOD_BAD_2x1";
    private static final String ACTION_MOOD_OKAY = "com.tapmood.app.MOOD_OKAY_2x1";
    private static final String ACTION_MOOD_GOOD = "com.tapmood.app.MOOD_GOOD_2x1";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget_2x1);
            views.setOnClickPendingIntent(R.id.btn_bad, getMoodPendingIntent(context, ACTION_MOOD_BAD));
            views.setOnClickPendingIntent(R.id.btn_okay, getMoodPendingIntent(context, ACTION_MOOD_OKAY));
            views.setOnClickPendingIntent(R.id.btn_good, getMoodPendingIntent(context, ACTION_MOOD_GOOD));
            applyBackground(context, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
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

    private PendingIntent getMoodPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MoodWidget2x1.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
${JAVA_UTILS}}
`;

// ============================================================
// 4x1 布局：标题 + 三个极简图标按钮
// ============================================================
const WIDGET_LAYOUT_4x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_bg_75"
    android:padding="10dp"
    android:gravity="center_vertical">

    <TextView android:id="@+id/widget_title"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="一点心情" android:textSize="12sp" android:textColor="#555555"
        android:textStyle="bold" android:layout_marginEnd="10dp"
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
// 2x1 布局：三个极简图标按钮（紧凑）
// ============================================================
const WIDGET_LAYOUT_2x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_bg_75"
    android:padding="6dp"
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
// 4x1: minWidth=276dp, minHeight=102dp (公式: 73*4-16=276, 118*1-16=102)
// 2x1: minWidth=130dp, minHeight=102dp (公式: 73*2-16=130)
// ============================================================
const WIDGET_INFO_4x1 = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description_4x1"
    android:initialLayout="@layout/mood_widget_4x1"
    android:minWidth="276dp" android:minHeight="102dp"
    android:minResizeWidth="130dp" android:minResizeHeight="102dp"
    android:maxResizeWidth="349dp" android:maxResizeHeight="102dp"
    android:resizeMode="horizontal"
    android:targetCellWidth="4" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

const WIDGET_INFO_2x1 = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description_2x1"
    android:initialLayout="@layout/mood_widget_2x1"
    android:minWidth="130dp" android:minHeight="102dp"
    android:minResizeWidth="57dp" android:minResizeHeight="102dp"
    android:maxResizeWidth="276dp" android:maxResizeHeight="102dp"
    android:resizeMode="horizontal"
    android:targetCellWidth="2" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

// ============================================================
// 极简矢量图标 - 圆形 + 简笔表情
// 差：淡蓝圆 + 下弯嘴
// 中：淡橙圆 + 直线嘴
// 好：淡绿圆 + 上弯嘴
// ============================================================
const IC_MOOD_BAD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-18,0a18,18 0,1 1,36 0a18,18 0,1 1,-36 0"
        android:fillColor="#E8EAF6"/>
    <!-- 眼睛 -->
    <path android:pathData="M14,15 L14,17" android:strokeColor="#7986CB" android:strokeWidth="2" android:strokeLineCap="round"/>
    <path android:pathData="M26,15 L26,17" android:strokeColor="#7986CB" android:strokeWidth="2" android:strokeLineCap="round"/>
    <!-- 下弯嘴 -->
    <path android:pathData="M15,28 Q20,24 25,28" android:strokeColor="#7986CB" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

const IC_MOOD_OKAY = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-18,0a18,18 0,1 1,36 0a18,18 0,1 1,-36 0"
        android:fillColor="#FFF3E0"/>
    <!-- 眼睛 -->
    <path android:pathData="M14,15 L14,17" android:strokeColor="#FFB74D" android:strokeWidth="2" android:strokeLineCap="round"/>
    <path android:pathData="M26,15 L26,17" android:strokeColor="#FFB74D" android:strokeWidth="2" android:strokeLineCap="round"/>
    <!-- 直线嘴 -->
    <path android:pathData="M15,26 L25,26" android:strokeColor="#FFB74D" android:strokeWidth="2" android:strokeLineCap="round"/>
</vector>`;

const IC_MOOD_GOOD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-18,0a18,18 0,1 1,36 0a18,18 0,1 1,-36 0"
        android:fillColor="#E8F5E9"/>
    <!-- 眼睛（弯弯笑眼） -->
    <path android:pathData="M12,16 Q14,13 16,16" android:strokeColor="#81C784" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <path android:pathData="M24,16 Q26,13 28,16" android:strokeColor="#81C784" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <!-- 上弯嘴 -->
    <path android:pathData="M15,24 Q20,30 25,24" android:strokeColor="#81C784" android:strokeWidth="2" android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

// ============================================================
// 按钮背景 - 极简圆角矩形
// ============================================================
const DRAWABLE_BTN_BAD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F5F5F5"/><corners android:radius="14dp"/></shape>`;
const DRAWABLE_BTN_OKAY = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F5F5F5"/><corners android:radius="14dp"/></shape>`;
const DRAWABLE_BTN_GOOD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F5F5F5"/><corners android:radius="14dp"/></shape>`;

// ============================================================
// 背景透明度等级
// ============================================================
const DRAWABLE_BG_0 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#00FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_25 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#40FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_50 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#80FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_75 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#BFFFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BG_100 = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFFFFFFF"/><corners android:radius="20dp"/></shape>`;

// ============================================================
const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?><resources>
<string name="widget_description_4x1">一点心情 - 快速记录（4x1）</string>
<string name="widget_description_2x1">一点心情 - 快速记录（2x1）</string>
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
    const has4x1 = existingReceivers.some((r) => r.$['android:name'] === '.MoodWidget4x1');
    const has2x1 = existingReceivers.some((r) => r.$['android:name'] === '.MoodWidget2x1');
    const newReceivers = [...existingReceivers];

    if (!has4x1) {
      newReceivers.push({
        $: { 'android:name': '.MoodWidget4x1', 'android:exported': 'true', 'android:label': '一点心情 (4x1)' },
        'intent-filter': [{ action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_BAD_4x1' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY_4x1' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD_4x1' } },
        ]}],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/mood_widget_info_4x1' } }],
      });
    }
    if (!has2x1) {
      newReceivers.push({
        $: { 'android:name': '.MoodWidget2x1', 'android:exported': 'true', 'android:label': '一点心情 (2x1)' },
        'intent-filter': [{ action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_BAD_2x1' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY_2x1' } },
          { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD_2x1' } },
        ]}],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/mood_widget_info_2x1' } }],
      });
    }
    application.receiver = newReceivers;
    return config;
  });

  config = withDangerousMod(config, ['android', async (config) => {
    const javaDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java/com/tapmood/app');
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');

    writeFile(javaDir, 'MoodWidget4x1.java', WIDGET_4x1_JAVA);
    writeFile(javaDir, 'MoodWidget2x1.java', WIDGET_2x1_JAVA);

    writeFile(path.join(resDir, 'layout'), 'mood_widget_4x1.xml', WIDGET_LAYOUT_4x1);
    writeFile(path.join(resDir, 'layout'), 'mood_widget_2x1.xml', WIDGET_LAYOUT_2x1);

    writeFile(path.join(resDir, 'xml'), 'mood_widget_info_4x1.xml', WIDGET_INFO_4x1);
    writeFile(path.join(resDir, 'xml'), 'mood_widget_info_2x1.xml', WIDGET_INFO_2x1);

    // 极简矢量图标
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_bad.xml', IC_MOOD_BAD);
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_okay.xml', IC_MOOD_OKAY);
    writeFile(path.join(resDir, 'drawable'), 'ic_mood_good.xml', IC_MOOD_GOOD);

    writeFile(path.join(resDir, 'drawable'), 'widget_btn_bad.xml', DRAWABLE_BTN_BAD);
    writeFile(path.join(resDir, 'drawable'), 'widget_btn_okay.xml', DRAWABLE_BTN_OKAY);
    writeFile(path.join(resDir, 'drawable'), 'widget_btn_good.xml', DRAWABLE_BTN_GOOD);

    writeFile(path.join(resDir, 'drawable'), 'widget_bg_0.xml', DRAWABLE_BG_0);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_25.xml', DRAWABLE_BG_25);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_50.xml', DRAWABLE_BG_50);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_75.xml', DRAWABLE_BG_75);
    writeFile(path.join(resDir, 'drawable'), 'widget_bg_100.xml', DRAWABLE_BG_100);

    writeFile(path.join(resDir, 'values'), 'strings_widget.xml', STRINGS_XML);

    // 清理旧文件
    [
      path.join(resDir, 'layout', 'mood_widget.xml'),
      path.join(resDir, 'xml', 'mood_widget_info.xml'),
      path.join(resDir, 'drawable', 'widget_dot.xml'),
      path.join(resDir, 'drawable', 'widget_background.xml'),
      path.join(javaDir, 'MoodWidgetProvider.java'),
    ].forEach((f) => { try { fs.unlinkSync(f); } catch {} });

    return config;
  }]);

  return config;
}

module.exports = withAndroidWidget;
