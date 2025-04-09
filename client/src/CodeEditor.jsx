import React, { useState } from 'react';
import './App.css';

export default function CodeEditor() {
  const [code, setCode] = useState('// Write your code here');
  const [output, setOutput] = useState('');
  const [filename, setFilename] = useState('main.cpp');

  const handleRun = async () => {
    try {
      const saveRes = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, code })
      });
      const saveData = await saveRes.json();
      const fileId = saveData?.fileId;

      if (!fileId) {
        setOutput('Execution failed: Could not get file ID.');
        return;
      }

      const res = await fetch(`/api/execute?fileId=${fileId}`, { method: 'POST' });
      const text = await res.text();
      setOutput(text);
    } catch (err) {
      setOutput('Execution failed: ' + err.message);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, code })
      });
      console.log('Code saved');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  return (
    <div className="editor-layout">
      <div className="header">
        <h1>🧠 Collaborative Code Editor</h1>
        <div>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename"
            style={{ padding: '4px 8px', marginRight: 8 }}
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={handleRun} style={{ marginLeft: 8 }}>Run</button>
        </div>
      </div>

      <div className="sidebar">
        <h2>📁 Files</h2>
        <ul>
          <li>main.java</li>
          <li>script.py</li>
          <li>index.js</li>
        </ul>
      </div>

      <div className="editor">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      </div>

      <div className="info-panel">
        <h2>🕒 Version Control</h2>
        <ul>
          <li>+ Added main.cpp</li>
          <li>~ Modified script.py</li>
        </ul>
      </div>

      <div className="console">
        {output || '// Output will appear here...'}
      </div>
    </div>
  );
}
