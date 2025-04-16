// src/ProjectDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectDetailPage() {
  // Extract projectId from the route parameter (ensure your route is defined as "/project/:id")
  const { id: projectId } = useParams();
  console.log("ProjectDetailPage projectId:", projectId);

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [folders, setFolders] = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({}); // Map: folderId -> list of files
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Role of the current user in this project
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState(""); // Optional parent folder for nested folder creation
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [selectedFolderIdForFile, setSelectedFolderIdForFile] = useState(""); // Folder for new file

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
          // Compare user ids as strings.
          const myRole = teamData.find(member => String(member.userId) === String(user.id));
          setUserRole(myRole ? myRole.role : null);
        }
      })
      .catch(err => console.error("Error fetching team:", err));
  }, [projectId, user]);

  // Fetch folders in the project.
  useEffect(() => {
    fetch(`/api/folders/project/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(folderData => {
        setFolders(folderData);
        // For each folder, fetch its files.
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
  // We ensure the filename has an extension—if not, we append ".txt".
  const handleCreateFile = (e) => {
    e.preventDefault();
    if (!selectedFolderIdForFile) {
      alert("Please select a folder to create the file in.");
      return;
    }
    // Check if newFileName has a dot; if not, append '.txt'
    const hasExtension = newFileName.includes(".");
    const baseFileName = newFileName;
    const fileNameWithExt = hasExtension ? baseFileName : baseFileName + ".txt";
    // Append a timestamp for uniqueness.
    // const uniqueFileName = fileNameWithExt + "_" + Date.now();
    const fileData = {
      filename: fileNameWithExt,
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

  if (!user || userRole === null) {
    return (
      <div style={{ padding: "40px" }}>
        You are not a member of this project; you can't see its details.
      </div>
    );
  }

  const canEdit = (userRole === "admin" || userRole === "editor");

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
                {member.userId} - {member.role}
                {userRole === "admin" && (
                  <button onClick={() => alert(`Edit team member ${member.userId}`)} style={{ marginLeft: "5px" }}>
                    Edit
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {userRole === "admin" && (
          <button onClick={() => alert("Add team member functionality")}>
            Manage Team
          </button>
        )}
      </div>

      {/* Right Panel: Folder Explorer */}
      <div style={{ flex: "1", paddingLeft: "20px" }}>
        <h2>Folder Structure</h2>
        {folders.length === 0 ? (
          <p>No folders available.</p>
        ) : (
          <ul>
            {folders.map(folder => (
              <li key={folder.id}>
                <strong>{folder.name}</strong>
                <ul>
                  {(filesByFolder[folder.id] || []).map(file => (
                    <li key={file.id}>
                      {file.filename}
                      {canEdit && (
                        <button onClick={() => alert(`Edit file ${file.id}`)} style={{ marginLeft: "10px" }}>
                          Edit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
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
        )}

        {canEdit && (
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
        )}
      </div>
    </div>
  );
}
