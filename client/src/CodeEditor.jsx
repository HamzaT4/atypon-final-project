import React, { useState } from 'react';

export default function CodeEditor() {
  const [code, setCode] = useState('// Write your code here');
  const [output, setOutput] = useState('');
  const [fileId, setFileId] = useState('demo-file');

  const handleRun = async () => {
    const res = await fetch(`/api/execute?fileId=${fileId}`, { method: 'POST' });
    const text = await res.text();
    setOutput(text);
  };

  const handleSave = () => {
    // Placeholder: Save logic will be implemented later
    console.log('Save clicked');
  };

  return (
    <div className="grid grid-cols-[200px_1fr_300px] grid-rows-[50px_1fr_150px] h-screen bg-gray-900 text-white">
      {/* Header Bar */}
      <div className="col-span-3 flex items-center justify-between px-6 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold">🧠 Collaborative Code Editor</h1>
        <div className="space-x-4">
          <button onClick={handleSave} className="bg-gray-600 px-4 py-1 rounded hover:bg-gray-500">Save</button>
          <button onClick={handleRun} className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-500">Run</button>
        </div>
      </div>

      {/* Sidebar - Folders */}
      <div className="row-span-2 border-r border-gray-700 p-4">
        <h2 className="font-bold mb-4">📁 Files</h2>
        <ul>
          <li className="hover:text-blue-400 cursor-pointer">main.java</li>
          <li className="hover:text-blue-400 cursor-pointer">utils.py</li>
          <li className="hover:text-blue-400 cursor-pointer">index.js</li>
        </ul>
      </div>

      {/* Code Editor */}
      <textarea
        className="w-full h-full resize-none bg-gray-800 p-4 font-mono border-r border-gray-700 focus:outline-none"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      {/* Right Sidebar - Info */}
      <div className="border-l border-gray-700 p-4">
        <h2 className="font-bold mb-4">🕒 Version Control</h2>
        <ul className="text-sm space-y-1">
          <li>+ Added new file</li>
          <li>~ Edited main.java</li>
          <li>- Removed temp.py</li>
        </ul>
      </div>

      {/* Output Console */}
      <div className="col-span-2 bg-black text-green-400 p-4 font-mono overflow-auto border-t border-gray-700">
        <p>{output || '// Output will appear here...'}</p>
      </div>
    </div>
  );
}
