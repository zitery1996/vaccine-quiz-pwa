/**
 * 录音组件 —— 圆形录音按钮 + 倒计时 + 实时预览
 */

import type { SpeechStatus } from '../types';

interface RecorderProps {
  /** 当前语音状态 */
  status: SpeechStatus;
  /** 倒计时格式化文本 MM:SS */
  timerText: string;
  /** 倒计时是否低于 60 秒 */
  timerWarning: boolean;
  /** 倒计时是否低于 10 秒 */
  timerDanger: boolean;
  /** 实时中间识别结果 */
  interimTranscript: string;
  /** 最终识别结果 */
  transcript: string;
  /** 语音是否可用 */
  speechSupported: boolean;
  /** 开始录音 */
  onStart: () => void;
  /** 停止录音 */
  onStop: () => void;
  /** 手动输入文本 */
  manualText: string;
  /** 手动输入变更 */
  onManualTextChange: (text: string) => void;
  /** 手动输入提交 */
  onManualSubmit: () => void;
}

export default function Recorder({
  status,
  timerText,
  timerWarning,
  timerDanger,
  interimTranscript,
  transcript,
  speechSupported,
  onStart,
  onStop,
  manualText,
  onManualTextChange,
  onManualSubmit,
}: RecorderProps) {
  const isListening = status === 'listening';
  const isIdle = status === 'idle';
  const hasError = status === 'error';
  const isUnsupported = status === 'unsupported';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '20px 0',
      }}
    >
      {/* 倒计时（录音时显示） */}
      {(isListening || status === 'stopped') && (
        <div
          className={`timer${timerDanger ? ' danger' : ''}${timerWarning && !timerDanger ? ' warning' : ''}`}
        >
          {timerText}
        </div>
      )}

      {/* 圆形录音/停止按钮 */}
      <button
        className={`record-btn${isListening ? ' recording' : ''}`}
        onClick={isListening ? onStop : onStart}
        disabled={
          isUnsupported || hasError || !speechSupported
        }
        aria-label={isListening ? '回答完成' : '开始录音'}
        title={
          isUnsupported
            ? '此浏览器不支持语音识别'
            : isListening
              ? '点击完成回答'
              : '点击开始录音回答'
        }
      >
        {isListening ? (
          // 停止图标（方形）
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // 麦克风图标
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      {/* 按钮标签 */}
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {isListening
          ? '回答完成'
          : isIdle
            ? '点击开始录音'
            : hasError
              ? '识别出错，请重试'
              : isUnsupported
                ? '语音识别不可用'
                : '准备中...'}
      </div>

      {/* 实时识别预览 */}
      {isListening && interimTranscript && (
        <div
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            minHeight: '48px',
          }}
        >
          {transcript}
          <span style={{ color: 'var(--color-text-muted)' }}>
            {interimTranscript}
          </span>
        </div>
      )}

      {/* 语音不可用时的错误提示 */}
      {isUnsupported && (
        <div
          style={{
            padding: '16px',
            background: 'var(--color-danger-light)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            color: 'var(--color-danger)',
            textAlign: 'center',
            maxWidth: '320px',
          }}
        >
          <p style={{ marginBottom: '8px' }}>
            ⚠️ 语音识别不可用
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            可能是浏览器不支持，或在 iOS 独立应用模式下。
            请使用下方文本输入框作答。
          </p>
        </div>
      )}

      {/* 手动输入备选（始终显示但可折叠） */}
      {!isListening && (
        <div style={{ width: '100%', marginTop: '8px' }}>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            或直接输入文字回答
          </p>
          <textarea
            className="text-input-area"
            placeholder="在此输入你的回答..."
            value={manualText}
            onChange={(e) => onManualTextChange(e.target.value)}
            rows={3}
          />
          <button
            className="btn btn-secondary btn-block"
            style={{ marginTop: '8px' }}
            onClick={onManualSubmit}
            disabled={!manualText.trim()}
          >
            提交文字回答
          </button>
        </div>
      )}
    </div>
  );
}
