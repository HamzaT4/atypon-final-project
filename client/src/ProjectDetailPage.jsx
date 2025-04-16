// src/ProjectDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Helper function to format file names by removing a trailing underscore plus digits (the timestamp)
function formatFileName(name) {
  const parts = name.split("_");
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    return parts.slice(0, parts.length - 1).join("_");
  }
  return name;
}

// Recursive component to render a folder as a collapsible tree.
// Now, for each file, if editing is allowed, an "Edit" button appears that redirects to the file edit page.
function FolderTree({ folder, allFolders, filesByFolder, canEdit, projectId, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const childFolders = allFolders.filter(f => f.parentId === folder.id);

  return (
    <li>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: childFolders.length ? 'pointer' : 'default', padding: '2px 0' }}
      >
        {folder.name} {childFolders.length ? (expanded ? '[-]' : '[+]') : ''}
      </div>
      {expanded && (
        <ul style={{ paddingLeft: "20px" }}>
          {(filesByFolder[folder.id] || []).map(file => (
            <li key={file.id} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{formatFileName(file.filename)}</span>
              {canEdit && (
                <button
                  onClick={() => navigate(`/project/${projectId}/file/${file.id}`)}
                  style={{ marginLeft: "10px" }}
                >
                  Edit
                </button>
              )}
            </li>
          ))}
          {childFolders.map(child => (
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
  console.log("ProjectDetailPage projectId:", projectId);

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [folders, setFolders] = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({});
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // States for file & folder creation
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [selectedFolderIdForFile, setSelectedFolderIdForFile] = useState("");

  // States for adding a new team member (admin only)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  // Fetch authenticated user info.
  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(res => res.json())
      .then(userData => setUser(userData))
      .catch(err => console.error("Error fetching user:", err));
  }, []);

  // Fetch project details.
  useEffect(() => {
    fetch(`/api/projects/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(projectData => setProject(projectData))
      .catch(err => console.error("Error fetching project:", err));
  }, [projectId]);

  // Fetch project team.
  useEffect(() => {
    fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(teamData => {
        setTeam(teamData);
        if (user && teamData.length > 0) {
          const myRole = teamData.find(member => String(member.userId) === String(user.id));
          setUserRole(myRole ? myRole.role : null);
        }
      })
      .catch(err => console.error("Error fetching team:", err));
  }, [projectId, user]);

  // Fetch user names for team members.
  useEffect(() => {
    if (team.length > 0) {
      Promise.all(
        team.map(member =>
          fetch(`/api/users/${member.userId}`, { credentials: 'include' })
            .then(res => res.json())
            .catch(err => ({ id: member.userId, username: member.userId }))
        )
      ).then(users => {
        const mapping = {};
        users.forEach(u => {
          mapping[u.id] = u.username;
        });
        setUserNames(mapping);
      });
    }
  }, [team]);

  // Fetch folders in the project.
  useEffect(() => {
    fetch(`/api/folders/project/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(folderData => {
        setFolders(folderData);
        folderData.forEach(folder => {
          fetch(`/api/files?folderId=${folder.id}`, { credentials: 'include' })
            .then(res => res.json())
            .then(files => {
              setFilesByFolder(prev => ({ ...prev, [folder.id]: files }));
            })
            .catch(err => console.error(`Error fetching files for folder ${folder.id}:`, err));
        });
      })
      .catch(err => console.error("Error fetching folders:", err));
  }, [projectId]);

  // Handle new folder creation.
  const handleCreateFolder = (e) => {
    e.preventDefault();
    const folderData = {
      name: newFolderName,
      projectId: Number(projectId),
      parentId: selectedParentId ? Number(selectedParentId) : null
    };
    fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(folderData)
    })
      .then(res => res.json())
      .then(createdFolder => {
        setFolders([...folders, createdFolder]);
        setNewFolderName("");
        setSelectedParentId("");
        setShowNewFolderForm(false);
      })
      .catch(err => console.error("Error creating folder:", err));
  };

  // Handle new file creation using the CodeController endpoint.
  const handleCreateFile = (e) => {
    e.preventDefault();
    if (!selectedFolderIdForFile) {
      alert("Please select a folder to create the file in.");
      return;
    }
    const uniqueFileName = newFileName + "_" + Date.now();
    const fileData = {
      filename: uniqueFileName,
      code: "",
      folderId: Number(selectedFolderIdForFile)
    };
    fetch('/api/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(fileData)
    })
      .then(res => res.json())
      .then(createdFile => {
        setFilesByFolder(prev => ({
          ...prev,
          [selectedFolderIdForFile]: [...(prev[selectedFolderIdForFile] || []), createdFile]
        }));
        setNewFileName("");
        setSelectedFolderIdForFile("");
        setShowNewFileForm(false);
      })
      .catch(err => console.error("Error creating file:", err));
  };

  // Handle adding a new team member.
  const handleAddMember = (e) => {
    e.preventDefault();
    // Check if the user exists.
    fetch(`/api/users/${newMemberUserId}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error("User not found");
        }
        return res.json();
      })
      .then(() => {
        const data = {
          userId: newMemberUserId,
          projectId: Number(projectId),
          role: newMemberRole
        };
        fetch('/api/project-user-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        })
          .then(res => res.json())
          .then(addedMember => {
            setTeam([...team, addedMember]);
            setShowAddMemberForm(false);
            setNewMemberUserId("");
            setNewMemberRole("");
          })
          .catch(err => console.error("Error adding member:", err));
      })
      .catch(err => alert("Error adding member: " + err.message));
  };

  // Handle removing a team member.
  const handleRemoveMember = (roleId) => {
    fetch(`/api/project-user-roles/${roleId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) {
          setTeam(team.filter(member => member.id !== roleId));
        } else {
          throw new Error("Failed to remove member");
        }
      })
      .catch(err => alert("Error removing member: " + err.message));
  };

  if (!user || userRole === null) {
    return (
      <div style={{ padding: "40px" }}>
        You are not a member of this project; you can't see its details.
      </div>
    );
  }

  const canEdit = (userRole === "admin" || userRole === "editor");

  // Build tree of folders: top-level folders have parentId null.
  const topLevelFolders = folders.filter(f => f.parentId == null);

  return (
    <div style={{ display: "flex", padding: "20px" }}>
      {/* Left Panel: Team Panel */}
      <div style={{ flex: "0 0 30%", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
        <h2>Team</h2>
        {team.length === 0 ? (
          <p>No team members.</p>
        ) : (
          <ul>
            {team.map(member => (
              <li key={member.id}>
                {`${userNames[member.userId] || member.userId} - ${member.role}`}
                {String(member.userId) !== String(project.owner) && userRole === "admin" && (
                  <>
                    <button
                      onClick={() => alert(`Edit role for ${member.userId}`)}
                      style={{ marginLeft: "5px" }}
                    >
                      Edit Role
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      style={{ marginLeft: "5px" }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {userRole === "admin" && (
          <div style={{ marginTop: "10px" }}>
            <button onClick={() => setShowAddMemberForm(!showAddMemberForm)}>
              {showAddMemberForm ? "Cancel Add Member" : "Add Member"}
            </button>
            {showAddMemberForm && (
              <form onSubmit={handleAddMember} style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="User ID"
                  value={newMemberUserId}
                  onChange={e => setNewMemberUserId(e.target.value)}
                  required
                  style={{ marginRight: "10px" }}
                />
                <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} required>
                  <option value="">Select Role</option>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" style={{ marginLeft: "10px" }}>Add</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Folder Explorer */}
      <div style={{ flex: "1", paddingLeft: "20px" }}>
        <h2>Folder Structure</h2>
        {folders.length === 0 ? (
          <p>No folders available.</p>
        ) : (
          <ul>
            {topLevelFolders.map(folder => (
              <FolderTree
                key={folder.id}
                folder={folder}
                allFolders={folders}
                filesByFolder={filesByFolder}
                canEdit={canEdit}
                projectId={projectId}
                navigate={navigate}
              />
            ))}
          </ul>
        )}

        <div style={{ marginTop: "20px" }}>
          <button onClick={() => setShowNewFolderForm(!showNewFolderForm)}>
            {showNewFolderForm ? "Cancel New Folder" : "+ New Folder"}
          </button>
          {showNewFolderForm && (
            <form onSubmit={handleCreateFolder} style={{ marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                style={{ marginRight: "10px" }}
              />
              <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)}>
                <option value="">No Parent (Top Level)</option>
                {folders.map(fold => (
                  <option key={fold.id} value={fold.id}>{fold.name}</option>
                ))}
              </select>
              <button type="submit" style={{ marginLeft: "10px" }}>Create Folder</button>
            </form>
          )}
        </div>

        <div style={{ marginTop: "20px" }}>
          <button onClick={() => setShowNewFileForm(!showNewFileForm)}>
            {showNewFileForm ? "Cancel New File" : "+ New File"}
          </button>
          {showNewFileForm && (
            <form onSubmit={handleCreateFile} style={{ marginTop: "10px" }}>
              <input
                type="text"
                placeholder="File Name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                required
                style={{ marginRight: "10px" }}
              />
              <select
                value={selectedFolderIdForFile}
                onChange={(e) => setSelectedFolderIdForFile(e.target.value)}
                required
              >
                <option value="">Select Folder</option>
                {folders.map(fold => (
                  <option key={fold.id} value={fold.id}>{fold.name}</option>
                ))}
              </select>
              <button type="submit" style={{ marginLeft: "10px" }}>Create File</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
