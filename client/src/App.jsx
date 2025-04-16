import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import ProjectPage from './ProjectPage';
import FilePage from './FilePage';
import ProjectDetailPage from './ProjectDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectDetailPage />} />
        <Route path="/project/:projectId/:fileId" element={<FilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
