/**
 * Expo Config Plugin：自动注入 Android 桌面小组件原生代码
 *
 * 设计目标：
 * - 小组件高度严格为 1 行，与桌面图标高度一致
 * - 小组件内仅显示 3 个可点击心情图标
 * - 应用名称“一点心情”由桌面启动器通过 android:label 显示在小组件下方
 * - 支持水平调整宽度，垂直高度保持 1 行不变
 *
 * 遵循 Android 12+ (API 31+) 小组件设计规范：
 * - targetCellWidth="4" targetCellHeight="1" 指定默认 4x1
 * - minHeight/minResizeHeight/maxResizeHeight 统一为 48dp，锁定 1 行高度
 * - resizeMode="horizontal" 仅允许水平调整
 * - previewLayout 实现 Android 12+ 选择器实时预览
 * - 使用系统标准圆角 (@android:dimen/system_app_widget_background_radius)
 */
const {
  withDangerousMod,
  withAndroidManifest,
  withMainActivity,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// 通用 Java 工具方法
// ============================================================
const JAVA_UTILS = `
    // 读取今日已记录的心情（widget_state.json 由 JS 侧写入），未记录返回空串
    private String getTodayRecordedMood(Context context) {
        try {
            java.io.File file = new java.io.File(context.getFilesDir(), "widget_state.json");
            if (!file.exists()) return "";
            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                org.json.JSONObject json = new org.json.JSONObject(sb.toString());
                String date = json.getString("date");
                String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
                String mood = json.optString("mood", "");
                return today.equals(date) ? mood : "";
            }
        } catch (Exception e) { return ""; }
    }

    private boolean isTodayMoodRecorded(Context context) {
        return !getTodayRecordedMood(context).isEmpty();
    }

    // 读取今日连续打卡天数（widget_state.json 由 JS 侧写入），无记录返回 0
    private int getTodayStreak(Context context) {
        try {
            java.io.File file = new java.io.File(context.getFilesDir(), "widget_state.json");
            if (!file.exists()) return 0;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                return new org.json.JSONObject(sb.toString()).optInt("streak", 0);
            }
        } catch (Exception e) { return 0; }
    }

    // 已记录反馈：已记录的按钮全亮，其余两个降低透明度（setImageAlpha API 16+）
    // 状态区显示：已记录显示 🔥连续天数，未记录显示提示点
    private void applyRecordedState(Context context, RemoteViews views) {
        String mood = getTodayRecordedMood(context);
        int dimAlpha = 100; // 未记录到的心情按钮透明度（约 40%）
        views.setInt(R.id.btn_bad, "setImageAlpha", "bad".equals(mood) ? 255 : dimAlpha);
        views.setInt(R.id.btn_okay, "setImageAlpha", "okay".equals(mood) ? 255 : dimAlpha);
        views.setInt(R.id.btn_good, "setImageAlpha", "good".equals(mood) ? 255 : dimAlpha);

        int streak = getTodayStreak(context);
        if (!mood.isEmpty() && streak > 0) {
            views.setTextViewText(R.id.widget_status, "🔥" + streak);
            views.setTextColor(R.id.widget_status, 0xFF2D2D2D);
        } else if (!mood.isEmpty()) {
            views.setTextViewText(R.id.widget_status, "✓");
            views.setTextColor(R.id.widget_status, 0xFF6E6E6E);
        } else {
            views.setTextViewText(R.id.widget_status, "···");
            views.setTextColor(R.id.widget_status, 0xFF9E9E9E);
        }
    }

    private int getBgAlphaLevel(Context context) {
        try {
            java.io.File file = new java.io.File(context.getFilesDir(), "widget_config.json");
            if (!file.exists()) return 3;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                return new org.json.JSONObject(sb.toString()).optInt("bgAlpha", 3);
            }
        } catch (Exception e) { return 3; }
    }

    private void applyBackground(Context context, RemoteViews views) {
        int level = getBgAlphaLevel(context);
        int[] bgResIds = { R.drawable.widget_bg_0, R.drawable.widget_bg_25, R.drawable.widget_bg_50, R.drawable.widget_bg_75, R.drawable.widget_bg_100 };
        if (level >= 0 && level < bgResIds.length) {
            views.setInt(R.id.widget_root, "setBackgroundResource", bgResIds[level]);
        }
    }

    // 刷新桌面上全部小组件实例（按 ComponentName 定位）
    static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new android.content.ComponentName(context, MoodWidget.class));
            if (ids != null && ids.length > 0) {
                Intent update = new Intent(context, MoodWidget.class);
                update.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                update.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                context.sendBroadcast(update);
            }
        } catch (Exception e) { /* 刷新失败静默 */ }
    }
`;

// ============================================================
// 单个 1 行小组件 Java
// 布局内仅包含 3 个可点击心情图标，名称由桌面启动器通过 android:label 显示
// ============================================================
const WIDGET_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.Toast;

public class MoodWidget extends AppWidgetProvider {
    private static final String ACTION_MOOD_BAD = "com.tapmood.app.MOOD_BAD";
    private static final String ACTION_MOOD_OKAY = "com.tapmood.app.MOOD_OKAY";
    private static final String ACTION_MOOD_GOOD = "com.tapmood.app.MOOD_GOOD";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget);
            setupClicks(context, views);
            applyBackground(context, views);
            // 已记录心情的按钮高亮、其余降低透明度，提供"今日已记录"视觉反馈
            applyRecordedState(context, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private void setupClicks(Context context, RemoteViews views) {
        views.setOnClickPendingIntent(R.id.btn_bad, getMoodPendingIntent(context, ACTION_MOOD_BAD, 1));
        views.setOnClickPendingIntent(R.id.btn_okay, getMoodPendingIntent(context, ACTION_MOOD_OKAY, 2));
        views.setOnClickPendingIntent(R.id.btn_good, getMoodPendingIntent(context, ACTION_MOOD_GOOD, 3));
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
// 小组件配置 Activity - 背景透明度选择
// ============================================================
const WIDGET_CONFIG_JAVA = `package com.tapmood.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RemoteViews;

public class WidgetConfigActivity extends Activity {
    private int appWidgetId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(createConfigLayout());

        Intent intent = getIntent();
        if (intent.hasExtra(AppWidgetManager.EXTRA_APPWIDGET_ID)) {
            appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        // 如果没有有效的 widget ID，取消
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            setResult(RESULT_CANCELED);
            finish();
        }
    }

    private View createConfigLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48, 48, 48, 48);

        // 标题
        android.widget.TextView title = new android.widget.TextView(this);
        title.setText("背景透明度");
        title.setTextSize(20);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.bottomMargin = 32;
        root.addView(title, titleParams);

        // 透明度选项
        String[] labels = {"透明", "25%", "50%", "75%", "不透明"};
        int[] levels = {0, 1, 2, 3, 4};

        // 读取当前设置
        int currentLevel = getBgAlphaLevel();

        for (int i = 0; i < labels.length; i++) {
            Button btn = new Button(this);
            btn.setText(labels[i]);
            btn.setAllCaps(false);
            btn.setTag(levels[i]);

            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            btnParams.bottomMargin = 8;

            if (levels[i] == currentLevel) {
                btn.setBackgroundColor(0xFF7986CB);
                btn.setTextColor(0xFFFFFFFF);
            } else {
                btn.setBackgroundColor(0xFFF5F5F5);
                btn.setTextColor(0xFF333333);
            }

            btn.setOnClickListener(v -> {
                int level = (int) v.getTag();
                saveBgAlphaLevel(level);
                updateWidget();
                Intent resultValue = new Intent();
                resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
                setResult(RESULT_OK, resultValue);
                finish();
            });

            root.addView(btn, btnParams);
        }

        return root;
    }

    private void saveBgAlphaLevel(int level) {
        try {
            org.json.JSONObject json = new org.json.JSONObject();
            json.put("bgAlpha", level);
            java.io.File file = new java.io.File(getFilesDir(), "widget_config.json");
            try (java.io.FileWriter writer = new java.io.FileWriter(file)) {
                writer.write(json.toString());
            }
        } catch (Exception e) { e.printStackTrace(); }
    }

    private int getBgAlphaLevel() {
        try {
            java.io.File file = new java.io.File(getFilesDir(), "widget_config.json");
            if (!file.exists()) return 3;
            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                return new org.json.JSONObject(sb.toString()).optInt("bgAlpha", 3);
            }
        } catch (Exception e) { return 3; }
    }

    private void updateWidget() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        RemoteViews views = new RemoteViews(getPackageName(), R.layout.mood_widget);
        // 应用背景
        int[] bgResIds = { R.drawable.widget_bg_0, R.drawable.widget_bg_25, R.drawable.widget_bg_50, R.drawable.widget_bg_75, R.drawable.widget_bg_100 };
        int level = getBgAlphaLevel();
        if (level >= 0 && level < bgResIds.length) {
            views.setInt(R.id.widget_root, "setBackgroundResource", bgResIds[level]);
        }
        // 按 ComponentName 刷新全部实例（原仅刷新单个 appWidgetId，多实例时其余不更新）
        appWidgetManager.updateAppWidget(new android.content.ComponentName(this, MoodWidget.class), views);
    }
}
`;

// ============================================================
// 小组件布局：仅三个可点击心情图标，无内部标题
// 高度固定为 1 行，宽度随桌面网格自动分配
// ============================================================
const WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_bg_75"
    android:paddingStart="10dp"
    android:paddingEnd="10dp"
    android:paddingTop="4dp"
    android:paddingBottom="4dp"
    android:gravity="center_vertical">

    <!-- 状态区：已记录显示 🔥连续天数 / ✓，未记录显示 ··· -->
    <TextView android:id="@+id/widget_status" android:layout_width="wrap_content"
        android:layout_height="match_parent" android:minWidth="36dp"
        android:gravity="center" android:textSize="13sp" android:textStyle="bold"
        android:text="···" android:textColor="#9E9E9E"
        android:layout_marginEnd="4dp"
        android:contentDescription="今日状态" />

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
// 小组件配置 XML（遵循 Android 12+ / One UI 8.5 标准）
// 默认 4x1，高度锁定为 1 行，仅允许水平调整宽度
// ============================================================
const WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:label="@string/widget_label"
    android:description="@string/widget_description"
    android:configure="com.tapmood.app.WidgetConfigActivity"
    android:widgetFeatures="reconfigurable"
    android:initialLayout="@layout/mood_widget"
    android:previewLayout="@layout/mood_widget"
    android:minWidth="276dp" android:minHeight="48dp"
    android:minResizeWidth="130dp" android:minResizeHeight="48dp"
    android:maxResizeWidth="349dp" android:maxResizeHeight="48dp"
    android:resizeMode="horizontal"
    android:targetCellWidth="4" android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen" />`;

// ============================================================
// 极简矢量图标 - 精致圆形 + 简笔表情
// 设计理念：与 App 内心情色统一（靛蓝/琥珀/薄荷绿）
// 差：淡靛蓝圆 + 圆点眼 + 下弯嘴
// 中：暖琥珀圆 + 圆点眼 + 直线嘴
// 好：薄荷绿圆 + 弯弯笑眼 + 上弯嘴
// ============================================================
const IC_MOOD_BAD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#E8EAF6"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#C5CAE9" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 圆点 -->
    <path android:pathData="M14.5,15.5m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#7986CB"/>
    <!-- 右眼 - 圆点 -->
    <path android:pathData="M25.5,15.5m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#7986CB"/>
    <!-- 下弯嘴 -->
    <path android:pathData="M14.5,27 Q20,22.5 25.5,27"
        android:strokeColor="#7986CB" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

const IC_MOOD_OKAY = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#FFF3E0"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#FFE0B2" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 圆点 -->
    <path android:pathData="M14.5,16m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#FFB74D"/>
    <!-- 右眼 - 圆点 -->
    <path android:pathData="M25.5,16m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"
        android:fillColor="#FFB74D"/>
    <!-- 直线嘴 -->
    <path android:pathData="M15,25 L25,25"
        android:strokeColor="#FFB74D" android:strokeWidth="1.8"
        android:strokeLineCap="round"/>
</vector>`;

const IC_MOOD_GOOD = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="40dp" android:height="40dp"
    android:viewportWidth="40" android:viewportHeight="40">
    <!-- 圆形背景 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:fillColor="#E8F5E9"/>
    <!-- 圆形描边 -->
    <path android:pathData="M20,20m-16,0a16,16 0,1 1,32 0a16,16 0,1 1,-32 0"
        android:strokeColor="#C8E6C9" android:strokeWidth="1" android:fillColor="@android:color/transparent"/>
    <!-- 左眼 - 弯弯笑眼 -->
    <path android:pathData="M12,17 Q14.5,13 17,17"
        android:strokeColor="#81C784" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <!-- 右眼 - 弯弯笑眼 -->
    <path android:pathData="M23,17 Q25.5,13 28,17"
        android:strokeColor="#81C784" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
    <!-- 上弯嘴 -->
    <path android:pathData="M14.5,24 Q20,30 25.5,24"
        android:strokeColor="#81C784" android:strokeWidth="1.8"
        android:strokeLineCap="round" android:fillColor="@android:color/transparent"/>
</vector>`;

// ============================================================
// 按钮背景 - 极简圆角矩形，带微妙色彩倾向
// ============================================================
const DRAWABLE_BTN_BAD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#E8EAF6"/><corners android:radius="12dp"/></shape>`;
const DRAWABLE_BTN_OKAY = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFF3E0"/><corners android:radius="12dp"/></shape>`;
const DRAWABLE_BTN_GOOD = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#E8F5E9"/><corners android:radius="12dp"/></shape>`;

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
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), content);
  } catch (e) {
    throw new Error(`withAndroidWidget: 写入 ${filename} 失败: ${e.message}`);
  }
}

// 将指定字符串合并到目标 strings.xml，已存在则更新，不存在则在 </resources> 前插入
function mergeStringsXml(targetPath, strings) {
  let content;
  if (fs.existsSync(targetPath)) {
    content = fs.readFileSync(targetPath, 'utf8');
  } else {
    content = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';
  }

  Object.entries(strings).forEach(([name, value]) => {
    const regex = new RegExp(`<string name="${name}"[^>]*>.*?</string>`, 's');
    const replacement = `<string name="${name}">${value}</string>`;
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
    } else {
      content = content.replace(/<\/resources>\s*$/, `  ${replacement}\n</resources>`);
    }
  });

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
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

    // 注册 WidgetConfigActivity
    const existingActivities = application.activity || [];
    const hasConfigActivity = existingActivities.some((a) => a.$['android:name'] === '.WidgetConfigActivity');
    if (!hasConfigActivity) {
      application.activity = [...existingActivities, {
        $: { 'android:name': '.WidgetConfigActivity', 'android:exported': 'true' }
      }];
    }

    return config;
  });

  // 注入 MainActivity.onResume：APP 回前台时刷新全部小组件
  // 覆盖"JS 写完 widget_state.json 后原生无感知"的断裂——记录心情回到桌面时按钮高亮即时更新
  config = withMainActivity(config, (config) => {
    const onResumeCode = `
    override fun onResume() {
        super.onResume()
        try {
            MoodWidget.updateAllWidgets(this)
        } catch (e: Exception) {
            // 刷新失败静默
        }
    }
`;
    if (!config.modResults.contents.includes('MoodWidget.updateAllWidgets')) {
      const contents = config.modResults.contents;
      // 在类体最后一个 } 前注入（MainActivity.kt 顶层唯一类）
      const lastBrace = contents.lastIndexOf('}');
      if (lastBrace === -1) {
        throw new Error('withAndroidWidget: 无法定位 MainActivity 类体结束位置');
      }
      config.modResults.contents =
        contents.slice(0, lastBrace) + onResumeCode + contents.slice(lastBrace);
    }
    return config;
  });

  config = withDangerousMod(config, ['android', async (config) => {
    const javaDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java/com/tapmood/app');
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');

    // Java 类
    writeFile(javaDir, 'MoodWidget.java', WIDGET_JAVA);
    writeFile(javaDir, 'WidgetConfigActivity.java', WIDGET_CONFIG_JAVA);

    // 布局
    writeFile(path.join(resDir, 'layout'), 'mood_widget.xml', WIDGET_LAYOUT);

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

    // 把小组件字符串合并到主 strings.xml，避免部分厂商/AAPT 无法读取独立 strings 文件
    // 同时防止 strings_widget.xml 与 strings.xml 重复定义导致 Duplicate resources
    mergeStringsXml(path.join(resDir, 'values', 'strings.xml'), {
      widget_label: '一点心情',
      widget_description: '快速记录今天的心情',
    });

    // 清理旧文件（只删不再使用的旧文件，不要删除当前正在写入的文件）
    [
      path.join(resDir, 'layout', 'mood_widget_4x1.xml'),
      path.join(resDir, 'layout', 'mood_widget_2x1.xml'),
      path.join(resDir, 'xml', 'mood_widget_info_4x1.xml'),
      path.join(resDir, 'xml', 'mood_widget_info_2x1.xml'),
      path.join(resDir, 'drawable', 'widget_dot.xml'),
      path.join(resDir, 'drawable', 'widget_background.xml'),
      path.join(resDir, 'values', 'strings_widget.xml'),
      path.join(javaDir, 'MoodWidgetProvider.java'),
      path.join(javaDir, 'MoodWidget4x1.java'),
      path.join(javaDir, 'MoodWidget2x1.java'),
    ].forEach((f) => { try { fs.unlinkSync(f); } catch {} });

    return config;
  }]);

  return config;
}

module.exports = withAndroidWidget;
