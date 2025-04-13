import React, { useState, useEffect } from 'react';

export default function ProjectPage() {
  // Hard-coded project id (update as needed)
  const projectId = 3;
  
  // State for folders within the project.
  const [folders, setFolders] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(''); // For nested folder selection; empty means no parent.

  // State for projects.
  const [projects, setProjects] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectOwner, setNewProjectOwner] = useState('');

  useEffect(() => {
    fetchFolders();
    fetchProjects();
  }, []);

  const fetchFolders = async () => {
    const res = await fetch(`/api/folders/project/${projectId}`);
    const data = await res.json();
    setFolders(data);
  };

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    // Construct the folder object with an optional parentId.
    const folderData = {
      name: newFolderName,
      projectId: projectId,
      parentId: selectedParentId ? parseInt(selectedParentId, 10) : null,
    };
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderData),
    });
    setShowFolderModal(false);
    setNewFolderName('');
    setSelectedParentId('');
    fetchFolders();
  };

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectOwner) return;
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName, owner: newProjectOwner }),
    });
    setShowProjectModal(false);
    setNewProjectName('');
    setNewProjectOwner('');
    fetchProjects();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Projects</h2>
      <button 
        onClick={() => setShowProjectModal(true)} 
        style={{ marginBottom: 10, marginRight: 10 }}
      >
        + Create Project
      </button>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            {p.name} (Owner: {p.owner})
          </li>
        ))}
      </ul>

      <h2>Project Folders (for project id: {projectId})</h2>
      <button 
        onClick={() => setShowFolderModal(true)} 
        style={{ marginBottom: 10 }}
      >
        + Create Folder
      </button>
      <ul>
        {folders.map((f) => (
          <li key={f.id}>
            {f.name} {f.parentId ? `(Child of folder ${f.parentId})` : ''}
          </li>
        ))}
      </ul>

      {showFolderModal && (
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
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="parentFolder">Select Parent Folder (optional): </label>
              <select 
                id="parentFolder" 
                value={selectedParentId} 
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                <option value="">None</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
            <div>
              <button onClick={handleCreateFolder}>Create</button>
              <button 
                onClick={() => {
                  setShowFolderModal(false);
                  setNewFolderName('');
                  setSelectedParentId('');
                }} 
                style={{ marginLeft: 10 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
            <h3>Create Project</h3>
            <input
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{ marginBottom: 10, width: '100%', padding: 5 }}
            />
            <input
              placeholder="Owner"
              value={newProjectOwner}
              onChange={(e) => setNewProjectOwner(e.target.value)}
              style={{ marginBottom: 10, width: '100%', padding: 5 }}
            />
            <div>
              <button onClick={handleCreateProject}>Create</button>
              <button 
                onClick={() => setShowProjectModal(false)} 
                style={{ marginLeft: 10 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
