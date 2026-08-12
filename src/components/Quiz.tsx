/**
 * 答题主界面
 *
 * 状态机: idle → listening → reviewing → idle (下一题)
 */

import { useState, useCallback, useEffect } from 'react';
import type { Question, DiffResult } from '../types';
import { useQuestions } from '../hooks/useQuestions';
import { useRecorder } from '../hooks/useRecorder';
import { useTimer } from '../hooks/useTimer';
import { compareAnswers } from '../utils/diff';
import { updateQuestionStats } from '../utils/db';
import Recorder from './Recorder';
import Result from './Result';

/** 答题阶段 */
type Phase = 'idle' | 'listening' | 'reviewing';

export default function Quiz() {
  // ---- 题库 ----
  const {
    questions,
    loading: questionsLoading,
    error: questionsError,
    pickNext,
    refresh,
  } = useQuestions();

  // ---- 状态 ----
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [manualText, setManualText] = useState('');
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  // 连续答对计数器（用于简单鼓励）
  const [streak, setStreak] = useState(0);

  // ---- 录音 ----
  const {
    status: speechStatus,
    transcript,
    interimTranscript,
    speechSupported,
    startRecording,
    stopRecording,
    abortRecording,
  } = useRecorder();

  // ---- 倒计时 (5分钟 = 300秒) ----
  const timer = useTimer(300);

  // ---- 选择下一题 ----
  const goToNextQuestion = useCallback(() => {
    const next = pickNext(answeredIds, reviewMode);
    if (next) {
      setCurrentQuestion(next);
      setPhase('idle');
      setDiffResult(null);
      setUserAnswer('');
      setManualText('');
      timer.reset();
    } else {
      // 题目用完了，重新开始（清空已答列表）
      setAnsweredIds(new Set());
      const fresh = pickNext(new Set(), reviewMode);
      if (fresh) {
        setCurrentQuestion(fresh);
        setPhase('idle');
        setDiffResult(null);
        setUserAnswer('');
        setManualText('');
        timer.reset();
      }
    }
  }, [pickNext, answeredIds, reviewMode, timer]);

  // ---- 初始化：加载第一题 ----
  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) {
      const first = pickNext(new Set(), reviewMode);
      if (first) {
        setCurrentQuestion(first);
      }
    }
  }, [questions, currentQuestion, pickNext, reviewMode]);

  // ---- 开始录音 ----
  const handleStartRecording = useCallback(async () => {
    setPhase('listening');
    timer.start();

    try {
      await startRecording();
    } catch (err) {
      // 如果语音不可用，保持页面让用户手动输入
      console.error('录音启动失败:', err);
      setPhase('idle');
      timer.stop();
    }
  }, [startRecording, timer]);

  // ---- 停止录音（用户点击"回答完成"）- 进行评判 ----
  const handleStopRecording = useCallback(() => {
    const finalText = stopRecording();
    timer.stop();
    handleSubmitAnswer(finalText);
  }, [stopRecording, timer]);

  // ---- 倒计时归零时自动停止 ----
  useEffect(() => {
    if (timer.isExpired && phase === 'listening') {
      const finalText = stopRecording();
      handleSubmitAnswer(finalText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isExpired]);

  // ---- 提交答案并评判 ----
  const handleSubmitAnswer = useCallback(
    (answerText: string) => {
      if (!currentQuestion) return;

      const finalAnswer = answerText || manualText.trim();
      setUserAnswer(finalAnswer);

      // 计算差异
      const diff = compareAnswers(finalAnswer, currentQuestion.answer);
      setDiffResult(diff);

      // 更新 IndexedDB 统计
      updateQuestionStats(currentQuestion.id, diff.isCorrect);

      // 更新已答列表
      setAnsweredIds((prev) => new Set(prev).add(currentQuestion.id));

      // 更新连续正确计数
      if (diff.isCorrect) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }

      // 进入评判阶段
      setPhase('reviewing');
    },
    [currentQuestion, manualText],
  );

  // ---- 手动输入提交 ----
  const handleManualSubmit = useCallback(() => {
    if (!manualText.trim()) return;
    timer.stop();
    abortRecording(); // 确保录音已停止
    handleSubmitAnswer(manualText.trim());
  }, [manualText, timer, abortRecording, handleSubmitAnswer]);

  // ---- 下一题 ----
  const handleNext = useCallback(() => {
    goToNextQuestion();
  }, [goToNextQuestion]);

  // ---- 加载中 ----
  if (questionsLoading) {
    return (
      <div className="page page-center">
        <div className="spinner" />
        <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>
          正在加载题库...
        </p>
      </div>
    );
  }

  // ---- 加载错误 ----
  if (questionsError) {
    return (
      <div className="page page-center">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>😞</div>
        <h2>题库加载失败</h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
            marginBottom: '20px',
            fontSize: '0.875rem',
          }}
        >
          {questionsError}
        </p>
        <button className="btn btn-primary" onClick={refresh}>
          重试
        </button>
      </div>
    );
  }

  // ---- 无题目 ----
  if (!currentQuestion) {
    return (
      <div className="page page-center">
        <p style={{ color: 'var(--color-text-secondary)' }}>
          暂无可用题目
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* 顶部：进度 + 错题模式开关 + 连击 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span>
          已答 {answeredIds.size} 题
          {streak >= 3 && (
            <span style={{ color: 'var(--color-warning)', marginLeft: '8px' }}>
              🔥 {streak} 连对！
            </span>
          )}
        </span>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <span>只练错题</span>
          <div
            className={`toggle${reviewMode ? ' active' : ''}`}
            onClick={() => {
              setReviewMode(!reviewMode);
              // 切换模式后立即换题
              setAnsweredIds(new Set());
              setPhase('idle');
              setCurrentQuestion(null);
              setDiffResult(null);
            }}
            role="switch"
            aria-checked={reviewMode}
          />
        </label>
      </div>

      {/* 题目 */}
      <div
        style={{
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 16px',
          marginBottom: '8px',
          border: '1px solid var(--color-primary)',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-primary-dark)',
            fontWeight: 600,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          📋 题目
        </div>
        <h1
          style={{
            fontSize: '1.25rem',
            lineHeight: 1.5,
            color: 'var(--color-text)',
          }}
        >
          {currentQuestion.question}
        </h1>
      </div>

      {/* 录音区域（非评判阶段） */}
      {phase !== 'reviewing' && (
        <Recorder
          status={speechStatus}
          timerText={timer.formatted}
          timerWarning={timer.seconds <= 60 && timer.seconds > 10}
          timerDanger={timer.seconds <= 10 && timer.isRunning}
          interimTranscript={interimTranscript}
          transcript={transcript}
          speechSupported={speechSupported}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          manualText={manualText}
          onManualTextChange={setManualText}
          onManualSubmit={handleManualSubmit}
        />
      )}

      {/* 结果弹窗（评判阶段） */}
      {phase === 'reviewing' && diffResult && (
        <Result
          diff={diffResult}
          standardAnswer={currentQuestion.answer}
          userAnswer={userAnswer}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
