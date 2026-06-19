/**
 * Expo Config Plugin：自动注入 Android 桌面小组件原生代码
 * 提供 4x1 和 2x1 两种尺寸的桌面小组件
 */
const {
  withDangerousMod,
  withAndroidManifest,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// 4x1 宽版小组件 Java 代码
// ============================================================
const WIDGET_4x1_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

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
            views.setOnClickPendingIntent(R.id.widget_root,
                PendingIntent.getActivity(context, 0, openApp,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
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
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction(Intent.ACTION_VIEW);
            launchIntent.setData(android.net.Uri.parse("tapmood://record?mood=" + mood));
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(launchIntent);
        }
    }

    private PendingIntent getMoodPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MoodWidget4x1.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}`;

// ============================================================
// 2x1 窄版小组件 Java 代码
// ============================================================
const WIDGET_2x1_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

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
            Intent openApp = new Intent(context, MainActivity.class);
            views.setOnClickPendingIntent(R.id.widget_root,
                PendingIntent.getActivity(context, 0, openApp,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
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
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction(Intent.ACTION_VIEW);
            launchIntent.setData(android.net.Uri.parse("tapmood://record?mood=" + mood));
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(launchIntent);
        }
    }

    private PendingIntent getMoodPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MoodWidget2x1.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}`;

// ============================================================
// 4x1 布局：标题 + 三个水平按钮（emoji+标签横排）
// ============================================================
const WIDGET_LAYOUT_4x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_background"
    android:padding="8dp"
    android:gravity="center_vertical">

    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="一点心情" android:textSize="13sp" android:textColor="#2D2D2D"
        android:textStyle="bold" android:layout_marginStart="4dp" android:layout_marginEnd="8dp" />

    <LinearLayout android:id="@+id/btn_bad" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_bad" android:padding="4dp" android:layout_margin="2dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😔" android:textSize="18sp" android:layout_marginEnd="2dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="差" android:textSize="12sp" android:textColor="#7986CB" android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout android:id="@+id/btn_okay" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_okay" android:padding="4dp" android:layout_margin="2dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😐" android:textSize="18sp" android:layout_marginEnd="2dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="中" android:textSize="12sp" android:textColor="#FFB74D" android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout android:id="@+id/btn_good" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_good" android:padding="4dp" android:layout_margin="2dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😊" android:textSize="18sp" android:layout_marginEnd="2dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="好" android:textSize="12sp" android:textColor="#81C784" android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>`;

// ============================================================
// 2x1 布局：紧凑横排，三个 emoji 按钮
// ============================================================
const WIDGET_LAYOUT_2x1 = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_background"
    android:padding="6dp"
    android:gravity="center_vertical">

    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="心情" android:textSize="12sp" android:textColor="#2D2D2D"
        android:textStyle="bold" android:layout_marginStart="2dp" android:layout_marginEnd="6dp" />

    <LinearLayout android:id="@+id/btn_bad" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_bad" android:padding="2dp" android:layout_margin="1dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😔" android:textSize="16sp" android:layout_marginEnd="1dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="差" android:textSize="11sp" android:textColor="#7986CB" android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout android:id="@+id/btn_okay" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_okay" android:padding="2dp" android:layout_margin="1dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😐" android:textSize="16sp" android:layout_marginEnd="1dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="中" android:textSize="11sp" android:textColor="#FFB74D" android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout android:id="@+id/btn_good" android:layout_width="0dp"
        android:layout_height="match_parent" android:layout_weight="1"
        android:orientation="horizontal" android:gravity="center"
        android:background="@drawable/widget_btn_good" android:padding="2dp" android:layout_margin="1dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="😊" android:textSize="16sp" android:layout_marginEnd="1dp" />
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="好" android:textSize="11sp" android:textColor="#81C784" android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>`;

// ============================================================
// 小组件配置 XML
// ============================================================
const WIDGET_INFO_4x1 = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description_4x1"
    android:initialLayout="@layout/mood_widget_4x1"
    android:minWidth="250dp" android:minHeight="40dp"
    android:resizeMode="horizontal"
    android:targetCellWidth="4" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

const WIDGET_INFO_2x1 = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description_2x1"
    android:initialLayout="@layout/mood_widget_2x1"
    android:minWidth="110dp" android:minHeight="40dp"
    android:resizeMode="horizontal"
    android:targetCellWidth="2" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

// ============================================================
// Drawable 资源
// ============================================================
const DRAWABLE_BG = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFFFFF"/><corners android:radius="16dp"/></shape>`;
const DRAWABLE_BTN = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F8F6F3"/><corners android:radius="10dp"/></shape>`;

// ============================================================
// Strings
// ============================================================
const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?><resources>
<string name="widget_description_4x1">一点心情 - 快速记录（4x1）</string>
<string name="widget_description_2x1">一点心情 - 快速记录（2x1）</string>
</resources>`;

// ============================================================
// 工具函数
// ============================================================
function writeFile(dir, filename, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
}

function withAndroidWidget(config) {
  // 1. 注入 AndroidManifest.xml 中的两个 receiver
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    const existingReceivers = application.receiver || [];
    const has4x1 = existingReceivers.some(
      (r) => r.$['android:name'] === '.MoodWidget4x1'
    );
    const has2x1 = existingReceivers.some(
      (r) => r.$['android:name'] === '.MoodWidget2x1'
    );

    const newReceivers = [...existingReceivers];

    if (!has4x1) {
      newReceivers.push({
        $: {
          'android:name': '.MoodWidget4x1',
          'android:exported': 'true',
          'android:label': '一点心情 (4x1)',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_BAD_4x1' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY_4x1' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD_4x1' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/mood_widget_info_4x1',
            },
          },
        ],
      });
    }

    if (!has2x1) {
      newReceivers.push({
        $: {
          'android:name': '.MoodWidget2x1',
          'android:exported': 'true',
          'android:label': '一点心情 (2x1)',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_BAD_2x1' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY_2x1' } },
              { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD_2x1' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/mood_widget_info_2x1',
            },
          },
        ],
      });
    }

    application.receiver = newReceivers;
    return config;
  });

  // 2. 注入原生文件
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/tapmood/app'
      );
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res'
      );

      // Java 代码
      writeFile(javaDir, 'MoodWidget4x1.java', WIDGET_4x1_JAVA);
      writeFile(javaDir, 'MoodWidget2x1.java', WIDGET_2x1_JAVA);

      // 布局文件
      writeFile(path.join(resDir, 'layout'), 'mood_widget_4x1.xml', WIDGET_LAYOUT_4x1);
      writeFile(path.join(resDir, 'layout'), 'mood_widget_2x1.xml', WIDGET_LAYOUT_2x1);

      // 小组件配置
      writeFile(path.join(resDir, 'xml'), 'mood_widget_info_4x1.xml', WIDGET_INFO_4x1);
      writeFile(path.join(resDir, 'xml'), 'mood_widget_info_2x1.xml', WIDGET_INFO_2x1);

      // Drawable 资源
      writeFile(path.join(resDir, 'drawable'), 'widget_background.xml', DRAWABLE_BG);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_bad.xml', DRAWABLE_BTN);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_okay.xml', DRAWABLE_BTN);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_good.xml', DRAWABLE_BTN);

      // Strings
      writeFile(path.join(resDir, 'values'), 'strings_widget.xml', STRINGS_XML);

      // 清理旧文件（从之前的单尺寸版本）
      const oldFiles = [
        path.join(resDir, 'layout', 'mood_widget.xml'),
        path.join(resDir, 'xml', 'mood_widget_info.xml'),
        path.join(resDir, 'drawable', 'widget_dot.xml'),
        path.join(javaDir, 'MoodWidgetProvider.java'),
      ];
      oldFiles.forEach((f) => {
        try { fs.unlinkSync(f); } catch {}
      });

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;
