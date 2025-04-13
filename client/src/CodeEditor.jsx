import React, { useState } from 'react';
import './App.css';

export default function CodeEditor() {
  const [code, setCode] = useState('// Write your code here');
  const [output, setOutput] = useState('');
  // Default filename and folder ID for new file creation.
  const [filename, setFilename] = useState('newFile.cpp');
  const [folderId, setFolderId] = useState(3); // Update folder ID as required
  const [fileId, setFileId] = useState(null);
  const [snapshotName, setSnapshotName] = useState(null);

  // Handler for creating a new file with an empty code string.
  const handleNewFile = async () => {
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, code: '', folderId })
      });
      const data = await res.json();

      if (!data.fileId) {
        console.error('New file creation failed: fileId not returned');
        return;
      }

      setFileId(data.fileId);
      console.log('New file created with ID:', data.fileId);
    } catch (err) {
      console.error('New file creation failed:', err);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, code, folderId })
      });
      const data = await res.json();

      if (!data.fileId) {
        console.error('Save failed: fileId not returned');
        return;
      }

      setFileId(data.fileId);

      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 15);
      const ext = filename.substring(filename.lastIndexOf('.'));
      const snapshot = `${data.fileId}_${timestamp}${ext}`;

      setSnapshotName(snapshot);
      console.log('Code saved as snapshot:', snapshot);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleRun = async () => {
    try {
      // First, save the current code.
      const saveRes = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, code, folderId })
      });

      const text = await saveRes.text();
      let saveData;
      try {
        saveData = JSON.parse(text);
      } catch (e) {
        setOutput('Save failed. Server returned non-JSON response:\n' + text);
        return;
      }

      const fileId = saveData?.fileId;
      const snapshotName = saveData?.snapshotName;

      if (!fileId || !snapshotName) {
        setOutput('Execution failed: Could not get file ID or snapshot name.');
        return;
      }

      // Then, execute the saved code.
      const res = await fetch(`/api/execute?fileId=${fileId}&snapshotName=${snapshotName}`, {
        method: 'POST'
      });

      const outputText = await res.text();
      setOutput(outputText);
    } catch (err) {
      setOutput('Execution failed: ' + err.message);
    }
  };

  return (
    <div className="editor-layout">
      <div className="header">
        <h1>Gitypon Hub</h1>
        <div>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename"
            style={{ padding: '4px 8px', marginRight: 8 }}
          />
          <button onClick={handleNewFile}>New File</button>
          <button onClick={handleSave}>Save</button>
          <button onClick={handleRun} style={{ marginLeft: 8 }}>Run</button>
        </div>
      </div>

      <div className="sidebar">
        <h2>📁 Files</h2>
        <ul>
          <li>{filename}</li>
          {/* This area can be enhanced to list all files */}
        </ul>
      </div>

      <div className="editor">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      </div>

      <div className="info-panel">
        <h2>🕒 Version Control</h2>
        <ul>
          <li>+ Added {filename}</li>
          <li>~ Modified script.py</li>
        </ul>
      </div>

      <div className="console">
        <pre>{output || '// Output will appear here...'}</pre>
      </div>
    </div>
  );
}
