// src/ProjectDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Helper function to strip a trailing “_timestamp” from filenames
function formatFileName(name) {
  const parts = name.split('_');
  const last = parts[parts.length - 1];
  return /^\d+$/.test(last) ? parts.slice(0, -1).join('_') : name;
}

// Recursive folder tree
function FolderTree({ folder, allFolders, filesByFolder, canEdit, projectId, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder.id);

  return (
    <li>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: children.length ? 'pointer' : 'default', padding: '2px 0' }}
      >
        {folder.name} {children.length ? (expanded ? '[-]' : '[+]') : ''}
      </div>
      {expanded && (
        <ul style={{ paddingLeft: 20 }}>
          {(filesByFolder[folder.id] || []).map(file => (
            <li key={file.id} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{formatFileName(file.filename)}</span>
              {canEdit && (
                <button
                  onClick={() => navigate(`/project/${projectId}/file/${file.id}`)}
                  style={{ marginLeft: 10 }}
                >
                  Edit
                </button>
              )}
            </li>
          ))}
          {children.map(child => (
            <FolderTree
              key={child.id}
              folder={child}
              allFolders={allFolders}
              filesByFolder={filesByFolder}
              canEdit={canEdit}
              projectId={projectId}
              navigate={navigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [folders, setFolders] = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({});
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [selectedFolderIdForFile, setSelectedFolderIdForFile] = useState('');

  /* ---------- Fetches ---------- */
  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(r => r.json())
      .then(setUser)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setProject)
      .catch(console.error);
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(teamData => {
        setTeam(teamData);
        if (user) {
          const me = teamData.find(m => String(m.userId) === String(user.id));
          setUserRole(me ? me.role : null);
        }
      })
      .catch(console.error);
  }, [projectId, user]);

  useEffect(() => {
    if (team.length) {
      Promise.all(
        team.map(m =>
          fetch(`/api/users/${m.userId}`, { credentials: 'include' })
            .then(r => r.json())
            .catch(() => ({ id: m.userId, username: m.userId }))
        )
      ).then(usersArr => {
        const map = {};
        usersArr.forEach(u => (map[u.id] = u.username));
        setUserNames(map);
      });
    }
  }, [team]);

  useEffect(() => {
    fetch(`/api/folders/project/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setFolders(data);
        data.forEach(f =>
          fetch(`/api/files?folderId=${f.id}`, { credentials: 'include' })
            .then(r => r.json())
            .then(files =>
              setFilesByFolder(prev => ({ ...prev, [f.id]: files }))
            )
            .catch(console.error)
        );
      })
      .catch(console.error);
  }, [projectId]);

  /* ---------- Handlers ---------- */
  const handleCreateFolder = e => {
    e.preventDefault();
    fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newFolderName,
        projectId: Number(projectId),
        parentId: selectedParentId ? Number(selectedParentId) : null
      })
    })
      .then(r => r.json())
      .then(f => {
        setFolders([...folders, f]);
        setNewFolderName('');
        setSelectedParentId('');
        setShowNewFolderForm(false);
      })
      .catch(console.error);
  };

  const handleCreateFile = e => {
    e.preventDefault();
    if (!selectedFolderIdForFile) return alert('Select a folder first!');
    fetch('/api/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: newFileName,
        code: '',
        folderId: Number(selectedFolderIdForFile)
      })
    })
      .then(r => r.json())
      .then(f => {
        setFilesByFolder(prev => ({
          ...prev,
          [selectedFolderIdForFile]: [...(prev[selectedFolderIdForFile] || []), f]
        }));
        setNewFileName('');
        setSelectedFolderIdForFile('');
        setShowNewFileForm(false);
      })
      .catch(console.error);
  };

  const handleRemoveMember = roleId => {
    fetch(`/api/project-user-roles/${roleId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
      .then(r => {
        if (r.ok) setTeam(team.filter(m => m.id !== roleId));
        else throw new Error('Failed');
      })
      .catch(err => alert(err.message));
  };

  /* ---------- Early exits ---------- */
  if (!user || userRole === null)
    return <div style={{ padding: 40 }}>You are not a member of this project.</div>;

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const topFolders = folders.filter(f => f.parentId == null);

  /* ---------- Render ---------- */
  return (
    <div style={{ display: 'flex', padding: 20 }}>
      {/* Team panel */}
      <div style={{ flex: '0 0 30%', borderRight: '1px solid #ccc', paddingRight: 20 }}>
        <h2>Team</h2>
        {team.length === 0 ? (
          <p>No team members.</p>
        ) : (
          <ul>
            {team.map(member => {
              const isProjectOwner = project && String(member.userId) === String(project.owner);
              return (
                <li key={member.id}>
                  {`${userNames[member.userId] || member.userId} - ${member.role}`}
                  {!isProjectOwner && userRole === 'admin' && (
                    <>
                      <button style={{ marginLeft: 5 }} onClick={() => alert('Edit role')}>
                        Edit Role
                      </button>
                      <button style={{ marginLeft: 5 }} onClick={() => handleRemoveMember(member.id)}>
                        Remove
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {userRole === 'admin' && (
          <div style={{ marginTop: 10 }}>
            {/* Add‑member UI omitted for brevity (unchanged) */}
          </div>
        )}
      </div>

      {/* Folder explorer */}
      <div style={{ flex: 1, paddingLeft: 20 }}>
        <h2>Folder Structure</h2>
        {folders.length === 0 ? (
          <p>No folders available.</p>
        ) : (
          <ul>
            {topFolders.map(f => (
              <FolderTree
                key={f.id}
                folder={f}
                allFolders={folders}
                filesByFolder={filesByFolder}
                canEdit={canEdit}
                projectId={projectId}
                navigate={navigate}
              />
            ))}
          </ul>
        )}

        {/* New folder form */}
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowNewFolderForm(!showNewFolderForm)}>
            {showNewFolderForm ? 'Cancel New Folder' : '+ New Folder'}
          </button>
          {showNewFolderForm && (
            <form onSubmit={handleCreateFolder} style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                required
                style={{ marginRight: 10 }}
              />
              <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)}>
                <option value="">No Parent</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button type="submit" style={{ marginLeft: 10 }}>
                Create
              </button>
            </form>
          )}
        </div>

        {/* New file form */}
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowNewFileForm(!showNewFileForm)}>
            {showNewFileForm ? 'Cancel New File' : '+ New File'}
          </button>
          {showNewFileForm && (
            <form onSubmit={handleCreateFile} style={{ marginTop: 10 }}>
              <input
                type="text"
                placeholder="File Name"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                required
                style={{ marginRight: 10 }}
              />
              <select
                value={selectedFolderIdForFile}
                onChange={e => setSelectedFolderIdForFile(e.target.value)}
                required
              >
                <option value="">Select Folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button type="submit" style={{ marginLeft: 10 }}>
                Create
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
