import React from 'react';
import { useParams } from 'react-router-dom';
import CodeEditor from './CodeEditor';

export default function FilePage() {
  const { projectId, fileId } = useParams();

  // For now, we simply display the file editor.
  // In the future, you might load specific file details based on fileId.
  return (
    <div style={{ padding: '20px' }}>
      <h1>Project {projectId} - File {fileId}</h1>
      {/* This could be extended to include a file/folder explorer */}
      <CodeEditor />
    </div>
  );
}
