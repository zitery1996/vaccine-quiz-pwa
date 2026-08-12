/**
 * App 根组件 —— 路由配置 + 安装引导
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Quiz from './components/Quiz';
import Statistics from './components/Statistics';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  return (
    <HashRouter>
      <InstallPrompt />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Quiz />} />
          <Route path="stats" element={<Statistics />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
