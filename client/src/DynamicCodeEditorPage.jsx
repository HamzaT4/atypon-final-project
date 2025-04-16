// src/DynamicCodeEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// Helper function to format file names by removing a trailing underscore plus digits (the timestamp)
function formatFileName(name) {
  const parts = name.split("_");
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    return parts.slice(0, parts.length - 1).join("_");
  }
  return name;
}

// Recursive component to render a folder as a collapsible tree with clickable file names.
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
              <Link to={`/project/${projectId}/file/${file.id}`}>
                {formatFileName(file.filename)}
              </Link>
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

export default function DynamicCodeEditorPage() {
  // Expecting route parameters: projectId and fileId
  const { projectId, fileId } = useParams();
  const navigate = useNavigate();
  console.log("DynamicCodeEditorPage projectId:", projectId, "fileId:", fileId);

  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [folders, setFolders] = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({});
  const [code, setCode] = useState(""); // Code content for the selected file
  const [output, setOutput] = useState(""); // Code execution output
  const [filename, setFilename] = useState(""); // Metadata filename

  // For saving purposes, if editing existing file, we need to know its folder.
  const [currentFolderId, setCurrentFolderId] = useState(0);

  // Fetch authenticated user info.
  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error("Error fetching user:", err));
  }, []);

  // Fetch project details.
  useEffect(() => {
    fetch(`/api/projects/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProject(data))
      .catch(err => console.error("Error fetching project:", err));
  }, [projectId]);

  // Fetch team roles to determine current user's role in the project.
  useEffect(() => {
    fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(teamData => {
        if (user && teamData.length > 0) {
          const myRole = teamData.find(member => String(member.userId) === String(user.id));
          setUserRole(myRole ? myRole.role : null);
        }
      })
      .catch(err => console.error("Error fetching team roles:", err));
  }, [projectId, user]);

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

  // Instead of calling a file content endpoint (which returns 404), we search through our loaded file lists.
  useEffect(() => {
    if (fileId) {
      // Look through each folder's files to find the one with matching id.
      let found = false;
      for (let key in filesByFolder) {
        const file = filesByFolder[key].find(f => f.id === fileId);
        if (file) {
          setFilename(file.filename);
          setCurrentFolderId(file.folderId);
          // Code content is not stored; default to empty.
          setCode("");
          found = true;
          break;
        }
      }
      if (!found) {
        // If not found, set filename to a default non-empty value to avoid errors.
        setFilename("untitled.txt");
      }
    }
  }, [fileId, filesByFolder]);

  // Handler for saving the edited code.
  const handleSave = async () => {
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Use the filename from state; ensure it is not empty.
        body: JSON.stringify({ filename: filename || "untitled.txt", code, folderId: currentFolderId || 0 })
      });
      const data = await res.json();
      if (!data.fileId) {
        console.error("Save failed: fileId not returned");
        return;
      }
      console.log("Code saved, snapshot:", data.snapshotName);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  // Handler for executing the code.
  const handleRun = async () => {
    try {
      // Save the code first to obtain snapshot details.
      const saveRes = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename: filename || "untitled.txt", code, folderId: currentFolderId || 0 })
      });
      const saveData = await saveRes.json();
      const fileIdFromSave = saveData.fileId;
      const snapshotName = saveData.snapshotName;
      if (!fileIdFromSave || !snapshotName) {
        setOutput("Execution failed: Could not get file ID or snapshot name.");
        return;
      }
      const res = await fetch(`/api/execute?fileId=${fileIdFromSave}&snapshotName=${snapshotName}`, {
        method: 'POST'
      });
      const outputText = await res.text();
      setOutput(outputText);
    } catch (err) {
      setOutput("Execution failed: " + err.message);
    }
  };

  if (!user || userRole === null) {
    return (
      <div style={{ padding: "40px" }}>
        You are not a member of this project; you can't see its details.
      </div>
    );
  }

  // Only allow editing if the user is admin or editor.
  const canEdit = (userRole === 'admin' || userRole === 'editor');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Section: Three Panels */}
      <div style={{ display: 'flex', flex: '1 1 auto' }}>
        {/* Left Panel: File Tree */}
        <div style={{ width: '20%', borderRight: '1px solid #ccc', overflowY: 'auto', padding: '10px' }}>
          <h3>File Structure</h3>
          {folders.length === 0 ? (
            <p>No folders available.</p>
          ) : (
            <ul>
              {folders.filter(f => f.parentId == null).map(folder => (
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
        </div>
        {/* Middle Panel: Code Editor */}
        <div style={{ width: '60%', padding: '10px' }}>
          <h3>Code Editor {filename && `- ${filename}`}</h3>
          <textarea
            style={{ width: '100%', height: '70%', fontFamily: 'monospace', fontSize: '14px' }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!canEdit}
          ></textarea>
          {canEdit && (
            <div style={{ marginTop: '10px' }}>
              <button onClick={handleSave}>Save</button>
              <button onClick={handleRun} style={{ marginLeft: '10px' }}>Run</button>
            </div>
          )}
        </div>
        {/* Right Panel: Version Control */}
        <div style={{ width: '20%', borderLeft: '1px solid #ccc', overflowY: 'auto', padding: '10px' }}>
          <h3>Version Control</h3>
          <p>Version history coming soon...</p>
        </div>
      </div>
      {/* Bottom Section: Console Output */}
      <div style={{ height: '20%', borderTop: '1px solid #ccc', padding: '10px', overflowY: 'auto' }}>
        <h3>Console Output</h3>
        <pre>{output || '// Output will appear here...'}</pre>
      </div>
    </div>
  );
}
