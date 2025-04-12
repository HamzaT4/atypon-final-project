import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectPage() {
    const id = 1;
  const [folders, setFolders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const res = await fetch(`/api/folders/project/${id}`);
    const data = await res.json();
    setFolders(data);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;

    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, projectId: id }),
    });

    setShowModal(false);
    setNewFolderName('');
    fetchFolders();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Project Folders</h2>

      <button onClick={() => setShowModal(true)} style={{ marginBottom: 10 }}>
        + Create Folder
      </button>

      <ul>
        {folders.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
            <h3>Create Folder</h3>
            <input
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              style={{ marginBottom: 10, width: '100%', padding: 5 }}
            />
            <div>
              <button onClick={handleCreateFolder}>Create</button>
              <button onClick={() => setShowModal(false)} style={{ marginLeft: 10 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
