/**
 * 统计列表中的单道题目条目
 */

import type { QuestionStats } from '../types';

interface QuestionItemProps {
  stat: QuestionStats;
}

export default function QuestionItem({ stat }: QuestionItemProps) {
  const total = stat.correctCount + stat.wrongCount;
  const errorRate = total === 0 ? 0 : Math.round((stat.wrongCount / total) * 100);

  return (
    <div className="stat-item">
      <div className="stat-info">
        <div className="stat-question">{stat.question}</div>
        <div className="stat-counts">
          ✅ {stat.correctCount} 次 &nbsp;|&nbsp; ❌ {stat.wrongCount} 次
          {total > 0 && (
            <span style={{ marginLeft: '8px' }}>
              · 错误率 {errorRate}%
            </span>
          )}
          {total === 0 && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              · 未作答
            </span>
          )}
        </div>
      </div>
      <div className="stat-bar">
        <div
          className="stat-bar-fill"
          style={{ width: `${errorRate}%` }}
        />
      </div>
    </div>
  );
}
