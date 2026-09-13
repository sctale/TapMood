/**
 * Expo Config Plugin：注入"导出到手机存储"原生能力
 *
 * 背景：Expo SDK 56 的 expo-file-system / expo-document-picker 均无
 * "保存到公共目录 / 另存为"API（旧 getDirectoryPermissionsAsync 已移除），
 * 纯 JS 无法把文件写入系统「下载」目录。
 *
 * 方案（与小组件同风格的 config plugin 原生注入）：
 * 1. JS 把备份 JSON 写入应用内部 export_tmp/（getFilesDir 子目录，无需桥接即可被原生读取）
 * 2. JS 通过 Linking.openURL('tapmoodexport://save?name=xxx.json') 拉起透明 Activity
 * 3. ExportToDownloadsActivity 把文件写入公共「下载」目录并 Toast 结果，随即 finish()
 *    - API 29+：MediaStore.Downloads（分区存储下无需任何运行时权限）
 *    - API ≤28：直写公共下载目录（依赖 WRITE_EXTERNAL_STORAGE，已按 maxSdkVersion=28 声明）
 *
 * 独立 scheme（tapmoodexport）避免与 MainActivity 的 tapmood:// 深链意图过滤器冲突；
 * exported=false 保证该入口仅本应用可拉起。
 */
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXPORT_ACTIVITY_JAVA = `package com.tapmood.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * tapmoodexport://save?name=<file.json>
 * 把 JS 预写入 export_tmp/ 的备份文件复制到系统公共「下载」目录。
 */
public class ExportToDownloadsActivity extends Activity {

    private static final String TAG = "TapMoodExport";
    private String lastError = "未知错误";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String name = null;
        Intent intent = getIntent();
        Uri data = intent != null ? intent.getData() : null;
        if (data != null) name = data.getQueryParameter("name");
        Log.d(TAG, "request name=" + name);

        boolean saved = false;
        String reason = "";
        // 白名单校验：仅允许字母数字与 . _ -，强制 .json 后缀，防路径穿越
        if (name != null && name.matches("[A-Za-z0-9_.\\\\-]+\\\\.json")) {
            File src = new File(getFilesDir(), "export_tmp" + File.separator + name);
            if (src.exists() && src.length() > 0) {
                saved = Build.VERSION.SDK_INT >= 29 ? saveViaMediaStore(src, name) : saveViaPublicDir(src, name);
                if (!saved) reason = lastError;
            } else {
                reason = "备份文件不存在";
            }
        } else {
            reason = "非法文件名";
        }

        if (saved) {
            Log.d(TAG, "saved ok: " + name);
            Toast.makeText(this, "已保存到「下载」目录：" + name, Toast.LENGTH_LONG).show();
        } else {
            Log.e(TAG, "save failed: " + reason);
            Toast.makeText(this, "保存失败（" + reason + "），请改用分享导出", Toast.LENGTH_LONG).show();
        }
        finish();
    }

    // API 29+：MediaStore 两段式写入（IS_PENDING→发布，部分 OEM Provider 要求该流程），
    // 同名自动加后缀不覆盖；失败时清理半截条目
    private boolean saveViaMediaStore(File src, String name) {
        Uri uri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, name);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                lastError = "MediaStore 拒绝创建条目";
                return false;
            }
            try (InputStream in = new FileInputStream(src);
                 OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) {
                    lastError = "无法打开输出流";
                    return false;
                }
                copy(in, out);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, values, null, null);
            return true;
        } catch (Exception e) {
            lastError = "MediaStore:" + e.getClass().getSimpleName();
            if (uri != null) {
                try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            }
            return false;
        }
    }

    // API ≤28：直写公共下载目录（需 WRITE_EXTERNAL_STORAGE，maxSdkVersion=28 已声明）
    private boolean saveViaPublicDir(File src, String name) {
        try {
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists() && !dir.mkdirs()) {
                lastError = "无法创建下载目录";
                return false;
            }
            File dst = new File(dir, name);
            if (dst.exists() && !dst.delete()) {
                lastError = "旧文件删除失败";
                return false;
            }
            try (InputStream in = new FileInputStream(src);
                 OutputStream out = new FileOutputStream(dst)) {
                copy(in, out);
            }
            return true;
        } catch (Exception e) {
            lastError = "Legacy:" + e.getClass().getSimpleName();
            return false;
        }
    }

    private void copy(InputStream in, OutputStream out) throws java.io.IOException {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        out.flush();
    }
}
`;

function withExportToDownloads(config) {
  // 1. Manifest：透明 Activity + 私有 scheme 意图过滤器 + ≤28 存储权限
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application[0];

    const activities = application.activity || [];
    // 声明式覆盖：无论是否已存在都写入当前期望形态，
    // 避免增量 prebuild 保留旧版 AndroidManifest 时改不动已注入条目
    // （历史教训：0.4.0 只声明 DEFAULT，而 RN Linking.openURL 发起的
    //  ACTION_VIEW 会携带 CATEGORY_BROWSABLE，缺 BROWSABLE 导致 ActivityNotFound）
    const desired = {
      $: {
        'android:name': '.ExportToDownloadsActivity',
        'android:exported': 'false',
        'android:noHistory': 'true',
        'android:excludeFromRecents': 'true',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ $: { 'android:scheme': 'tapmoodexport' } }],
        },
      ],
    };
    const idx = activities.findIndex((a) => a.$['android:name'] === '.ExportToDownloadsActivity');
    if (idx === -1) {
      activities.push(desired);
    } else {
      activities[idx] = desired;
    }
    application.activity = activities;

    const perms = manifest['uses-permission'] || [];
    const hasPerm = perms.some((p) => p.$['android:name'] === 'android.permission.WRITE_EXTERNAL_STORAGE');
    if (!hasPerm) {
      perms.push({
        $: {
          'android:name': 'android.permission.WRITE_EXTERNAL_STORAGE',
          'android:maxSdkVersion': '28',
        },
      });
      manifest['uses-permission'] = perms;
    }

    return cfg;
  });

  // 2. 写入 Java 源文件（与小组件同目录）
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/java/com/tapmood/app');
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(path.join(javaDir, 'ExportToDownloadsActivity.java'), EXPORT_ACTIVITY_JAVA);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withExportToDownloads;
