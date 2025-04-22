// src/ProjectDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Recursively render folder tree
function FolderTree({ folder, allFolders, filesByFolder, canEdit, projectId, navigate, onDeleteFolder, onDeleteFile }) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder.id);

  return (
    <li>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', padding: '2px 0' }}
      >
        {folder.name} {children.length ? (expanded ? '[-]' : '[+]') : ''}
        {canEdit && (
          <button className="danger" onClick={() => onDeleteFolder(folder.id)} style={{ marginLeft: 10, color: 'red' }}>
            Delete Folder
          </button>
        )}
      </div>
      {expanded && (
        <ul style={{ paddingLeft: 20 }}>
          {(filesByFolder[folder.id] || []).map(file => (
            <li key={file.id} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{file.filename}</span>
              {canEdit && (
                <>
                  <button
                    onClick={() => navigate(`/project/${projectId}/file/${file.id}`)}
                    style={{ marginLeft: 10 }}
                  >
                    Edit
                  </button>
                  <button
                  className="danger"
                    onClick={() => onDeleteFile(file.id)}
                    style={{ marginLeft: 10, color: 'red' }}
                  >
                    Delete
                  </button>
                </>
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
              onDeleteFolder={onDeleteFolder}
              onDeleteFile={onDeleteFile}
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

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');

  const canEdit = userRole === 'admin' || userRole === 'editor';

  const fetchFoldersAndFiles = () => {
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
  };

  const getFirstFileId = () => {
    for (const folderId of Object.keys(filesByFolder)) {
      const files = filesByFolder[folderId];
      if (files && files.length > 0) {
        return files[0].id;
      }
    }
    return null;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await fetch('/api/user-auth', { credentials: 'include' });
        const userData = await userRes.json();
        setUser(userData);

        const projectRes = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
        const projectData = await projectRes.json();
        setProject(projectData);

        const teamRes = await fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' });
        const teamData = await teamRes.json();
        setTeam(teamData);

        const me = teamData.find(m => String(m.userId) === String(userData.id));
        setUserRole(me ? me.role : null);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [projectId]);

  useEffect(() => {
    if (!team.length) return;
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
  }, [team]);

  useEffect(fetchFoldersAndFiles, [projectId]);

  useEffect(() => {
    if (!user || !team.length) return;
    const me = team.find(m => String(m.userId) === String(user.id));
    setUserRole(me ? me.role : null);
  }, [user, team]);

  const handleAddMember = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const allUsers = await res.json();
      const matches = allUsers.filter(u => u.username === newMemberUsername);
      if (!matches.length) {
        alert('User not found');
        return;
      }
      const targetUser = matches[0];
      const createRes = await fetch('/api/project-user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: Number(projectId),
          userId: targetUser.id,
          role: newMemberRole
        })
      });
      if (!createRes.ok) throw new Error('Failed to add member');
      const newRole = await createRes.json();
      setTeam(prev => [...prev, newRole]);
      setNewMemberUsername('');
      setNewMemberRole('viewer');
      setShowAddMember(false);
    } catch (err) {
      alert(err.message || 'Something went wrong');
    }
  };

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
      .then(() => {
        setNewFolderName('');
        setSelectedParentId('');
        setShowNewFolderForm(false);
        fetchFoldersAndFiles();
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
      .then(() => {
        setNewFileName('');
        setSelectedFolderIdForFile('');
        setShowNewFileForm(false);
        fetchFoldersAndFiles();
      })
      .catch(console.error);
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to delete this folder and all its contents?")) return;
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE', credentials: 'include' });
    fetchFoldersAndFiles();
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    await fetch(`/api/files/${fileId}`, { method: 'DELETE', credentials: 'include' });
    fetchFoldersAndFiles();
  };

  if (!user || userRole === null)
    return <div style={{ padding: 40 }}>You are not a member of this project.</div>;

  const topFolders = folders.filter(f => f.parentId == null);
  const firstFileId = getFirstFileId();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>

      <div style={{ flex: '0 0 30%', borderRight: '1px solid #ccc', padding: 20 }}>
        <h2>Team</h2>
        <ul>
          {team.map(member => {
            const isOwner = project && String(member.userId) === String(project.owner);
            return (
              <li key={member.id}>
                {`${userNames[member.userId] || member.userId} - ${member.role}`}
                {!isOwner && userRole === 'admin' && (
                  <>
                    <button onClick={() => alert('Edit role')} style={{ marginLeft: 5 }}>Edit Role</button>
                    <button onClick={() => {
                      fetch(`/api/project-user-roles/${member.id}`, { method: 'DELETE', credentials: 'include' })
                        .then(r => r.ok && setTeam(t => t.filter(m => m.id !== member.id)))
                        .catch(console.error);
                    }} style={{ marginLeft: 5 }}>Remove</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {userRole === 'admin' && (
          <div style={{ marginTop: 20 }}>
            {!showAddMember ? (
              <button onClick={() => setShowAddMember(true)}>+ Add Member</button>
            ) : (
              <div style={{ marginTop: 10 }}>
                <input
                  placeholder="Username"
                  value={newMemberUsername}
                  onChange={e => setNewMemberUsername(e.target.value)}
                  style={{ marginRight: 10 }}
                />
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value)}
                  style={{ marginRight: 10 }}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={handleAddMember}>Add</button>
                <button onClick={() => setShowAddMember(false)} style={{ marginLeft: 10 }}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <h2>Folder Structure</h2>
        {topFolders.length === 0 ? (
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
                onDeleteFolder={handleDeleteFolder}
                onDeleteFile={handleDeleteFile}
              />
            ))}
          </ul>
        )}

        {canEdit && (
          <>
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
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button type="submit" style={{ marginLeft: 10 }}>Create</button>
                </form>
              )}
            </div>

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
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button type="submit" style={{ marginLeft: 10 }}>Create</button>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {firstFileId && (
          <div style={{ padding: '10px 20px' }}>
            <button
              onClick={() => navigate(`/project/${projectId}/file/${firstFileId}`)}
              style={{ padding: '10px 20px', fontSize: '16px' }}
            >
              {canEdit ? 'Edit Project' : 'View Project'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
