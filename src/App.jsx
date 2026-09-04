import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomeMenu from './ui/HomeMenu';
import LoginMenu from './ui/LoginMenu';
import TreeEditor from './ui/TreeEditor';
import TreeViewer from './ui/TreeViewer';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/login" element={<LoginMenu />} />
        <Route path="/tree" element={<TreeEditor />} />
        <Route path="/view/:treeId" element={<TreeViewer />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
