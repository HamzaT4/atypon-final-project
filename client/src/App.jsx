import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';

import ProjectDetailPage from './ProjectDetailPage';
import DynamicCodeEditorPage from './DynamicCodeEditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectDetailPage />} />
        <Route path="/project/:projectId/file/:fileId" element={<DynamicCodeEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
