/**
 * 录音 + 语音识别 Hook
 *
 * 封装 SpeechRecognizer 的生命周期管理
 */

import { useState, useRef, useCallback } from 'react';
import type { SpeechStatus } from '../types';
import { SpeechRecognizer, canUseSpeech } from '../utils/speech';

export interface UseRecorderReturn {
  /** 当前识别状态 */
  status: SpeechStatus;
  /** 最终识别文本 */
  transcript: string;
  /** 实时中间结果 */
  interimTranscript: string;
  /** 语音是否可用 */
  speechSupported: boolean;
  /** 开始录音识别 */
  startRecording: () => Promise<void>;
  /** 停止录音识别，返回最终文本 */
  stopRecording: () => string;
  /** 中止（取消） */
  abortRecording: () => void;
}

export function useRecorder(): UseRecorderReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported] = useState(() => canUseSpeech());

  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  const startRecording = useCallback(async () => {
    // 创建识别器
    const recognizer = new SpeechRecognizer(
      // 状态变化
      (s) => setStatus(s),
      // 文本变化
      (final, interim) => {
        setTranscript(final);
        setInterimTranscript(interim);
      },
    );

    recognizerRef.current = recognizer;

    try {
      await recognizer.start();
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, []);

  const stopRecording = useCallback((): string => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return '';

    const finalText = recognizer.stop();
    recognizerRef.current = null;
    return finalText || transcript;
  }, [transcript]);

  const abortRecording = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (recognizer) {
      recognizer.abort();
      recognizerRef.current = null;
    }
    setTranscript('');
    setInterimTranscript('');
    setStatus('idle');
  }, []);

  return {
    status,
    transcript,
    interimTranscript,
    speechSupported,
    startRecording,
    stopRecording,
    abortRecording,
  };
}
