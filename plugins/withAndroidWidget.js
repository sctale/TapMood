/**
 * Expo Config Plugin：自动注入 Android 桌面小组件原生代码
 * 在 prebuild 时将小组件的 Java 代码、布局文件和 Manifest 配置注入到 android 目录
 */
const {
  withDangerousMod,
  withAndroidManifest,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 小组件 Java 代码
const WIDGET_JAVA = `package com.tapmood.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

public class MoodWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_MOOD_BAD = "com.tapmood.app.MOOD_BAD";
    private static final String ACTION_MOOD_OKAY = "com.tapmood.app.MOOD_OKAY";
    private static final String ACTION_MOOD_GOOD = "com.tapmood.app.MOOD_GOOD";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget);
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
            updateWidgetDisplay(context, mood);
        }
    }

    private PendingIntent getMoodPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MoodWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void updateWidgetDisplay(Context context, String mood) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, MoodWidgetProvider.class));
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget);
            views.setViewVisibility(R.id.indicator_bad, View.INVISIBLE);
            views.setViewVisibility(R.id.indicator_okay, View.INVISIBLE);
            views.setViewVisibility(R.id.indicator_good, View.INVISIBLE);
            switch (mood) {
                case "bad": views.setViewVisibility(R.id.indicator_bad, View.VISIBLE); break;
                case "okay": views.setViewVisibility(R.id.indicator_okay, View.VISIBLE); break;
                case "good": views.setViewVisibility(R.id.indicator_good, View.VISIBLE); break;
            }
            manager.updateAppWidget(id, views);
        }
    }
}`;

// 小组件布局 XML
const WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center">
    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="一点心情" android:textSize="14sp" android:textColor="#2D2D2D"
        android:textStyle="bold" android:layout_marginBottom="8dp" />
    <TextView android:id="@+id/tv_prompt" android:layout_width="wrap_content"
        android:layout_height="wrap_content" android:text="今天心情如何？"
        android:textSize="12sp" android:textColor="#9E9E9E" android:layout_marginBottom="10dp" />
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content"
        android:orientation="horizontal" android:gravity="center">
        <LinearLayout android:id="@+id/btn_bad" android:layout_width="0dp"
            android:layout_height="wrap_content" android:layout_weight="1"
            android:orientation="vertical" android:gravity="center"
            android:background="@drawable/widget_btn_bad" android:padding="8dp" android:layout_margin="3dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="😔" android:textSize="24sp" />
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="差" android:textSize="11sp" android:textColor="#7986CB" android:textStyle="bold" />
            <View android:id="@+id/indicator_bad" android:layout_width="6dp" android:layout_height="6dp"
                android:background="@drawable/widget_dot" android:visibility="invisible" android:layout_marginTop="3dp" />
        </LinearLayout>
        <LinearLayout android:id="@+id/btn_okay" android:layout_width="0dp"
            android:layout_height="wrap_content" android:layout_weight="1"
            android:orientation="vertical" android:gravity="center"
            android:background="@drawable/widget_btn_okay" android:padding="8dp" android:layout_margin="3dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="😐" android:textSize="24sp" />
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="中" android:textSize="11sp" android:textColor="#FFB74D" android:textStyle="bold" />
            <View android:id="@+id/indicator_okay" android:layout_width="6dp" android:layout_height="6dp"
                android:background="@drawable/widget_dot" android:visibility="invisible" android:layout_marginTop="3dp" />
        </LinearLayout>
        <LinearLayout android:id="@+id/btn_good" android:layout_width="0dp"
            android:layout_height="wrap_content" android:layout_weight="1"
            android:orientation="vertical" android:gravity="center"
            android:background="@drawable/widget_btn_good" android:padding="8dp" android:layout_margin="3dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="😊" android:textSize="24sp" />
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="好" android:textSize="11sp" android:textColor="#81C784" android:textStyle="bold" />
            <View android:id="@+id/indicator_good" android:layout_width="6dp" android:layout_height="6dp"
                android:background="@drawable/widget_dot" android:visibility="invisible" android:layout_marginTop="3dp" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>`;

// 小组件配置 XML
const WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description"
    android:initialLayout="@layout/mood_widget"
    android:minWidth="250dp" android:minHeight="40dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4" android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`;

// Drawable 资源
const DRAWABLE_BG = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FFFFFF"/><corners android:radius="20dp"/></shape>`;
const DRAWABLE_BTN = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#F8F6F3"/><corners android:radius="12dp"/></shape>`;
const DRAWABLE_DOT = `<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval"><solid android:color="#FFFFFF"/></shape>`;

const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?><resources><string name="widget_description">快速记录今天的心情</string></resources>`;

function writeFile(dir, filename, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
}

function withAndroidWidget(config) {
  // 1. 注入 AndroidManifest.xml 中的 receiver
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    // 检查是否已添加
    const existingReceivers = application.receiver || [];
    const hasWidget = existingReceivers.some(
      (r) => r.$['android:name'] === '.MoodWidgetProvider'
    );

    if (!hasWidget) {
      application.receiver = [
        ...(application.receiver || []),
        {
          $: {
            'android:name': '.MoodWidgetProvider',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
                { $: { 'android:name': 'com.tapmood.app.MOOD_BAD' } },
                { $: { 'android:name': 'com.tapmood.app.MOOD_OKAY' } },
                { $: { 'android:name': 'com.tapmood.app.MOOD_GOOD' } },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': '@xml/mood_widget_info',
              },
            },
          ],
        },
      ];
    }

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
      writeFile(javaDir, 'MoodWidgetProvider.java', WIDGET_JAVA);

      // 布局文件
      writeFile(path.join(resDir, 'layout'), 'mood_widget.xml', WIDGET_LAYOUT);

      // 小组件配置
      writeFile(path.join(resDir, 'xml'), 'mood_widget_info.xml', WIDGET_INFO);

      // Drawable 资源
      writeFile(path.join(resDir, 'drawable'), 'widget_background.xml', DRAWABLE_BG);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_bad.xml', DRAWABLE_BTN);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_okay.xml', DRAWABLE_BTN);
      writeFile(path.join(resDir, 'drawable'), 'widget_btn_good.xml', DRAWABLE_BTN);
      writeFile(path.join(resDir, 'drawable'), 'widget_dot.xml', DRAWABLE_DOT);

      // Strings
      writeFile(path.join(resDir, 'values'), 'strings_widget.xml', STRINGS_XML);

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;
