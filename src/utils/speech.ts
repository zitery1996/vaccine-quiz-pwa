/**
 * Web Speech API 语音识别封装
 *
 * 平台兼容:
 *   - Chrome/Edge: SpeechRecognition
 *   - Safari/iOS 14.5+: webkitSpeechRecognition
 *   - iOS PWA (standalone): 不支持 SpeechRecognition → 降级手动输入
 *
 * 配置:
 *   - continuous: true  (持续识别)
 *   - interimResults: true  (实时中间结果)
 *   - lang: zh-CN  (中文普通话)
 */

import type { SpeechStatus } from '../types';

// 浏览器 SpeechRecognition 类型（webkit 前缀）
const SpeechRecognitionAPI =
  (window as unknown as Record<string, unknown>).SpeechRecognition ||
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

/**
 * 检测语音识别是否可用
 */
export function isSpeechSupported(): boolean {
  return !!SpeechRecognitionAPI;
}

/**
 * 检测是否为 iOS PWA 独立模式（SpeechRecognition 不可用）
 */
export function isIOSPWA(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches;
  return isIOS && isStandalone;
}

/**
 * 检查是否支持语音输入（综合考虑平台）
 */
export function canUseSpeech(): boolean {
  return isSpeechSupported() && !isIOSPWA();
}

// SpeechRecognition 实例类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export class SpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private _status: SpeechStatus = 'idle';
  private _transcript = '';
  private _interimTranscript = '';
  private resolvePromise: ((value: string) => void) | null = null;
  private rejectPromise: ((reason: Error) => void) | null = null;
  private onStatusChange: ((status: SpeechStatus) => void) | null = null;
  private onTranscriptChange:
    | ((final: string, interim: string) => void)
    | null = null;

  get status(): SpeechStatus {
    return this._status;
  }

  get transcript(): string {
    return this._transcript;
  }

  get interimTranscript(): string {
    return this._interimTranscript;
  }

  /**
   * @param onStatusChange 状态变化回调
   * @param onTranscriptChange 识别文本变化回调 (final, interim)
   */
  constructor(
    onStatusChange?: (status: SpeechStatus) => void,
    onTranscriptChange?: (final: string, interim: string) => void,
  ) {
    this.onStatusChange = onStatusChange || null;
    this.onTranscriptChange = onTranscriptChange || null;
  }

  private setStatus(status: SpeechStatus) {
    this._status = status;
    this.onStatusChange?.(status);
  }

  /**
   * 预热麦克风权限（iOS Safari 需要用户手势触发）
   * 在首次使用前调用，可提高识别成功率
   */
  async warmup(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // 权限被拒，后续 start() 会处理
    }
  }

  /**
   * 开始语音识别
   * @returns Promise，resolve 时返回最终识别文本
   */
  async start(): Promise<string> {
    // 检查是否可用
    if (!isSpeechSupported()) {
      this.setStatus('unsupported');
      throw new Error('您的浏览器不支持语音识别');
    }

    if (isIOSPWA()) {
      this.setStatus('unsupported');
      throw new Error(
        'iOS 独立应用中不支持语音识别，请在 Safari 浏览器中打开',
      );
    }

    // 重置状态
    this._transcript = '';
    this._interimTranscript = '';

    // 创建识别实例
    const Recognition = SpeechRecognitionAPI as SpeechRecognitionConstructor;
    this.recognition = new Recognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    // 只返回单条最终结果（减少冗余）
    this.recognition.maxAlternatives = 1;

    // 事件处理
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this._transcript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      this._interimTranscript = interim;
      this.onTranscriptChange?.(this._transcript, interim);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('语音识别错误:', event.error, event.message);

      // 'no-speech' 不算致命错误，继续监听
      if (event.error === 'no-speech') {
        return;
      }

      // 'aborted' 是主动停止，正常处理
      if (event.error === 'aborted') {
        return;
      }

      this.setStatus('error');
      this.rejectPromise?.(
        new Error(`语音识别错误: ${event.error}`),
      );
    };

    this.recognition.onend = () => {
      // 如果之前是 listening 状态，说明是被动结束
      if (this._status === 'listening') {
        this.setStatus('stopped');
        this.resolvePromise?.(this._transcript);
      }
    };

    // 启动识别
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      try {
        this.recognition!.start();
        this.setStatus('listening');
      } catch (err) {
        this.setStatus('error');
        reject(
          new Error(
            `无法启动语音识别: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }
    });
  }

  /**
   * 停止语音识别，返回最终文本
   */
  stop(): string {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // 忽略 stop 时的错误
      }
      this.recognition = null;
    }

    this.setStatus('stopped');
    // resolve promise 以完成 start() 返回的 Promise
    this.resolvePromise?.(this._transcript);
    return this._transcript;
  }

  /**
   * 中止识别（不返回结果）
   */
  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // 忽略
      }
      this.recognition = null;
    }
    this.setStatus('idle');
    this.rejectPromise?.(new Error('用户取消'));
  }
}
