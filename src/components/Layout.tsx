/**
 * Layout 组件 —— 顶部导航 + 页面容器 + 底部导航
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const isQuizPage = location.pathname === '/quiz';

  // 答题页面不显示导航栏（沉浸式）
  if (isQuizPage) {
    return (
      <>
        <Outlet />
      </>
    );
  }

  return (
    <>
      {/* 顶部导航 */}
      <nav className="navbar">
        <span className="navbar-title">💉 疫苗知识抽背</span>
        {location.pathname === '/' ? (
          <NavLink to="/stats" className="navbar-link">
            📊 统计
          </NavLink>
        ) : (
          <NavLink to="/" className="navbar-link">
            📝 答题
          </NavLink>
        )}
      </nav>

      {/* 页面内容 */}
      <Outlet />

      {/* 底部导航 */}
      <nav className="bottom-nav">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          答题
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          统计
        </NavLink>
      </nav>
    </>
  );
}
