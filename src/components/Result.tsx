/**
 * 答题结果展示组件 —— 评判结论 + 红色高亮标记
 */

import type { DiffResult } from '../types';

interface ResultProps {
  /** 差异比较结果 */
  diff: DiffResult;
  /** 标准答案（纯文本，用于展示） */
  standardAnswer: string;
  /** 用户回答 */
  userAnswer: string;
  /** 点击下一题 */
  onNext: () => void;
}

export default function Result({
  diff,
  standardAnswer,
  userAnswer,
  onNext,
}: ResultProps) {
  const { similarity, isCorrect, markedAnswer, markedUserAnswer } = diff;

  return (
    <div className="result-overlay" onClick={(e) => {
      // 点击遮罩层不关闭（必须点击按钮）
      e.stopPropagation();
    }}>
      <div className="result-panel">
        {/* 评判结论 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '3rem',
              marginBottom: '8px',
            }}
          >
            {isCorrect ? '✅' : '❌'}
          </div>
          <h2
            style={{
              color: isCorrect
                ? 'var(--color-primary)'
                : 'var(--color-danger)',
            }}
          >
            {isCorrect ? '回答正确！' : '回答有误'}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginTop: '4px',
            }}
          >
            相似度: {Math.round(similarity * 100)}%
            {similarity >= 0.8 ? ' (≥80%)' : ' (<80%)'}
          </p>
        </div>

        {/* 用户答案（带错误标记） */}
        {markedUserAnswer.length > 0 && userAnswer.trim() && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              📝 你的回答
            </div>
            <div
              className="card"
              style={{
                fontSize: '0.9rem',
                lineHeight: 2,
                wordBreak: 'break-all',
              }}
            >
              {markedUserAnswer.map((token, i) => (
                <span
                  key={i}
                  className={
                    token.type === 'error'
                      ? 'mark-error'
                      : token.type === 'correct'
                        ? 'mark-correct'
                        : ''
                  }
                >
                  {token.text}
                </span>
              ))}
              {markedUserAnswer.length === 0 && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  (未识别到回答内容)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 标准答案（带缺漏标记） */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            📖 标准答案
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 400,
                marginLeft: '8px',
              }}
            >
              (红色为遗漏或错误部分)
            </span>
          </div>
          <div
            className="card"
            style={{
              fontSize: '0.9rem',
              lineHeight: 2,
              wordBreak: 'break-all',
              borderColor: isCorrect
                ? 'var(--color-primary)'
                : 'var(--color-danger-light)',
            }}
          >
            {markedAnswer.map((token, i) => (
              <span
                key={i}
                className={
                  token.type === 'missing'
                    ? 'mark-missing'
                    : token.type === 'correct'
                      ? 'mark-correct'
                      : ''
                }
              >
                {token.text}
              </span>
            ))}
            {markedAnswer.length === 0 && (
              <span>{standardAnswer}</span>
            )}
          </div>
        </div>

        {/* 图例 */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span className="mark-missing" style={{ marginRight: '4px' }}>
              缺漏
            </span>
            = 你漏说了
          </span>
          <span>
            <span className="mark-error" style={{ marginRight: '4px' }}>
              错误
            </span>
            = 你说错了
          </span>
          <span>
            <span className="mark-correct" style={{ marginRight: '4px' }}>
              正确
            </span>
            = 完全匹配
          </span>
        </div>

        {/* 下一题按钮 */}
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={onNext}
          autoFocus
        >
          {isCorrect ? '👉 下一题' : '📚 下一题（加油！）'}
        </button>
      </div>
    </div>
  );
}
