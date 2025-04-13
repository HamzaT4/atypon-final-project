import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import ProjectPage from './ProjectPage';
import FilePage from './FilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:projectId" element={<ProjectPage />} />
        <Route path="/project/:projectId/:fileId" element={<FilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
