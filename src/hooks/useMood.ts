import { useState, useEffect, useCallback, useRef } from 'react';
import type { MoodRecord, MoodLevel, MoodStats } from '../types';
import * as moodDB from '../database/moodDB';

// 获取今日心情
export function useTodayMood() {
  const [mood, setMood] = useState<MoodRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const record = await moodDB.getTodayMood();
      setMood(record);
    } catch (e) {
      setError('加载今日心情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const recordMood = useCallback(async (level: MoodLevel): Promise<MoodRecord | null> => {
    // 防止快速重复点击
    if (recordingRef.current) return null;
    recordingRef.current = true;

    // 安全超时：即使异步操作异常卡住，3秒后自动释放
    const safetyTimeout = setTimeout(() => {
      recordingRef.current = false;
    }, 3000);

    try {
      setError(null);
      const record = await moodDB.recordMood(level);
      setMood(record);
      return record;
    } catch (e) {
      setError('记录心情失败');
      throw e;
    } finally {
      clearTimeout(safetyTimeout);
      recordingRef.current = false;
    }
  }, [setMood]);

  return { mood, loading, error, recordMood, refresh };
}

// 获取日期范围内的心情记录
export function useMoodRange(startDate: string, endDate: string) {
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await moodDB.getMoodRange(startDate, endDate);
      setRecords(data);
    } catch (e) {
      setError('加载记录失败');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // 参数变化时自动加载，带竞态取消
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setLoading(true);
      try {
        setError(null);
        const data = await moodDB.getMoodRange(startDate, endDate);
        if (!isCancelled) setRecords(data);
      } catch (e) {
        if (!isCancelled) {
          setError('加载记录失败');
          setRecords([]);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();
    return () => { isCancelled = true; };
  }, [startDate, endDate]);

  return { records, loading, error, refresh };
}

// 获取心情统计
export function useMoodStats(startDate: string, endDate: string) {
  const [stats, setStats] = useState<MoodStats>({ bad: 0, okay: 0, good: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await moodDB.getMoodStats(startDate, endDate);
      setStats(data);
    } catch (e) {
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // 参数变化时自动加载，带竞态取消
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setLoading(true);
      try {
        setError(null);
        const data = await moodDB.getMoodStats(startDate, endDate);
        if (!isCancelled) setStats(data);
      } catch (e) {
        if (!isCancelled) setError('加载统计数据失败');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();
    return () => { isCancelled = true; };
  }, [startDate, endDate]);

  return { stats, loading, error, refresh };
}
