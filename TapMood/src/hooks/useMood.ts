import { useState, useEffect, useCallback } from 'react';
import type { MoodRecord, MoodLevel, MoodStats } from '../types';
import * as moodDB from '../database/moodDB';
import { getToday } from '../utils/dateUtils';

// 获取今日心情
export function useTodayMood() {
  const [mood, setMood] = useState<MoodRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const record = await moodDB.getTodayMood();
      setMood(record);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const recordMood = useCallback(async (level: MoodLevel) => {
    const record = await moodDB.recordMood(level);
    setMood(record);
    return record;
  }, []);

  return { mood, loading, recordMood, refresh };
}

// 获取日期范围内的心情记录
export function useMoodRange(startDate: string, endDate: string) {
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await moodDB.getMoodRange(startDate, endDate);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { refresh(); }, [refresh]);

  return { records, loading, refresh };
}

// 获取心情统计
export function useMoodStats(startDate: string, endDate: string) {
  const [stats, setStats] = useState<MoodStats>({ bad: 0, okay: 0, good: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await moodDB.getMoodStats(startDate, endDate);
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}
