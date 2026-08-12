/**
 * 统计看板页面
 *
 * 功能:
 *   - 总览: 总答题次数、正确率、错题数
 *   - 题目列表: 每道题的对/错次数 + 错误率进度条
 *   - 排序: 按错误率降序 / 默认排序
 *   - 筛选: 全部 / 仅错题
 */

import { useState, useMemo } from 'react';
import { useStats } from '../hooks/useStats';
import QuestionItem from './QuestionItem';

type SortMode = 'default' | 'errorRate';

export default function Statistics() {
  const {
    stats,
    loading,
    totalAttempts,
    accuracy,
    wrongCount,
    reset,
  } = useStats();

  const [sortMode, setSortMode] = useState<SortMode>('errorRate');
  const [filterWrong, setFilterWrong] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 排序 + 筛选
  const displayStats = useMemo(() => {
    let list = [...stats];

    // 筛选
    if (filterWrong) {
      list = list.filter((s) => s.wrongCount > 0);
    }

    // 排序
    if (sortMode === 'errorRate') {
      list.sort((a, b) => {
        const totalA = a.correctCount + a.wrongCount;
        const totalB = b.correctCount + b.wrongCount;
        const rateA = totalA === 0 ? 0 : a.wrongCount / totalA;
        const rateB = totalB === 0 ? 0 : b.wrongCount / totalB;
        return rateB - rateA; // 降序
      });
    }

    return list;
  }, [stats, sortMode, filterWrong]);

  const handleReset = async () => {
    await reset();
    setShowResetConfirm(false);
  };

  if (loading) {
    return (
      <div className="page page-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      {/* 总览卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}
          >
            {totalAttempts}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
              marginTop: '2px',
            }}
          >
            总答题
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color:
                accuracy >= 80
                  ? 'var(--color-primary)'
                  : accuracy >= 50
                    ? 'var(--color-warning)'
                    : 'var(--color-danger)',
            }}
          >
            {accuracy}%
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
              marginTop: '2px',
            }}
          >
            正确率
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-danger)',
            }}
          >
            {wrongCount}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-secondary)',
              marginTop: '2px',
            }}
          >
            错题数
          </div>
        </div>
      </div>

      {/* 控制栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* 排序切换 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn btn-secondary`}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: sortMode === 'errorRate' ? 700 : 400,
              background:
                sortMode === 'errorRate'
                  ? 'var(--color-primary-light)'
                  : undefined,
            }}
            onClick={() => setSortMode('errorRate')}
          >
            按错误率
          </button>
          <button
            className={`btn btn-secondary`}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: sortMode === 'default' ? 700 : 400,
              background:
                sortMode === 'default'
                  ? 'var(--color-primary-light)'
                  : undefined,
            }}
            onClick={() => setSortMode('default')}
          >
            默认
          </button>
        </div>

        {/* 筛选 + 重置 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <span>仅错题</span>
            <div
              className={`toggle${filterWrong ? ' active' : ''}`}
              style={{ width: '36px', height: '22px' }}
              onClick={() => setFilterWrong(!filterWrong)}
              role="switch"
              aria-checked={filterWrong}
            />
          </label>
          <button
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              color: 'var(--color-danger)',
            }}
            onClick={() => setShowResetConfirm(true)}
          >
            重置
          </button>
        </div>
      </div>

      {/* 题目列表 */}
      {displayStats.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
            🎉
          </div>
          <h3>没有错题</h3>
          <p>
            {filterWrong
              ? '太棒了！所有题目都已掌握'
              : '暂无答题记录，快去答题吧'}
          </p>
        </div>
      ) : (
        <div
          className="card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          {displayStats.map((stat) => (
            <QuestionItem key={stat.id} stat={stat} />
          ))}
        </div>
      )}

      {/* 总题数提示 */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
          marginTop: '16px',
        }}
      >
        共 {stats.length} 道题 · 已答{' '}
        {stats.filter((s) => s.correctCount + s.wrongCount > 0).length} 道
        {filterWrong && ` · 错题 ${displayStats.length} 道`}
      </div>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <div className="result-overlay">
          <div
            className="result-panel"
            style={{ maxHeight: 'none', textAlign: 'center' }}
          >
            <h2 style={{ marginBottom: '12px' }}>确认重置？</h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: '20px',
                fontSize: '0.875rem',
              }}
            >
              将清除所有答题统计数据，题目本身不受影响。
            </p>
            <div
              style={{ display: 'flex', gap: '12px' }}
            >
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setShowResetConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger btn-block"
                onClick={handleReset}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
