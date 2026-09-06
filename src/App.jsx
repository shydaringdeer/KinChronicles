import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomeMenu from './ui/HomeMenu';
import LoginMenu from './ui/LoginMenu';
import TreeEditor from './ui/TreeEditor';
import TreeViewer from './ui/TreeViewer';

import TimelineEditor from './ui/TimelineEditor';
import CalendarEditor from './ui/CalendarEditor';

import NameListEditor from './ui/NameListEditor';
import ManuscriptEditor from './ui/ManuscriptEditor';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/login" element={<LoginMenu />} />
        <Route path="/tree" element={<TreeEditor />} />
        <Route path="/view/:treeId" element={<TreeViewer />} />
        <Route path="/timeline" element={<TimelineEditor />} />
        <Route path="/calendar" element={<CalendarEditor />} />
        <Route path="/names" element={<NameListEditor />} />
        <Route path="/manuscript" element={<ManuscriptEditor />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
