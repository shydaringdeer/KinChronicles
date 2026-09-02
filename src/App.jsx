import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeMenu from './ui/HomeMenu';
import LoginMenu from './ui/LoginMenu';
import TreeEditor from './ui/TreeEditor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeMenu />} />
        <Route path="/login" element={<LoginMenu />} />
        <Route path="/tree" element={<TreeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
