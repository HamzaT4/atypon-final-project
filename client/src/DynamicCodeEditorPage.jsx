import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import { Client } from '@stomp/stompjs';

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatFileName(name) {
  const parts = name.split('_');
  const last  = parts[parts.length - 1];
  return /^\d+$/.test(last) ? parts.slice(0, -1).join('_') : name;
}

// Recursively render folder tree
function FolderTree({ folder, allFolders, filesByFolder, projectId }) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder.id);

  return (
    <li>
      <div
        style={{ cursor: children.length ? 'pointer' : 'default', padding: 2 }}
        onClick={() => setExpanded(!expanded)}
      >
        {folder.name} {children.length ? (expanded ? '[-]' : '[+]') : ''}
      </div>
      {expanded && (
        <ul style={{ paddingLeft: 20 }}>
          {(filesByFolder[folder.id] || []).map(file => (
            <li key={file.id}>
              <Link to={`/project/${projectId}/file/${file.id}`}>
                {formatFileName(file.filename)}
              </Link>
            </li>
          ))}
          {children.map(ch => (
            <FolderTree
              key={ch.id}
              folder={ch}
              allFolders={allFolders}
              filesByFolder={filesByFolder}
              projectId={projectId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Format timestamp nicely
function formatTimestamp(ts) {
  try {
    const base = ts.split('.')[0].replace(' ', 'T');
    const d    = new Date(base);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

/* ─────────────────────────── Page Component ───────────────────── */

export default function DynamicCodeEditorPage() {
  const { projectId, fileId } = useParams();
  const navigate               = useNavigate();

  /* ------------- state ------------- */
  const [user, setUser]                   = useState(null);
  const [userRole, setUserRole]           = useState(null);
  const [folders, setFolders]             = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({});
  const [filename, setFilename]           = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const [code, setCode]           = useState('');
  const [output, setOutput]       = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [expandedSnapshots, setExpandedSnapshots] = useState({});
  const [snapshotDiffs, setSnapshotDiffs] = useState({});

  const [stompClient, setStompClient] = useState(null);
  const [editNotification, setEditNotification] = useState(null);
  const [userNames, setUserNames] = useState({});

  
  /* ------------- auth / role ------------- */
  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(r => r.json())
      .then(async data => {
        try {
          const res = await fetch(`/api/users/${data.id}`, { credentials: 'include' });
          const userDetails = await res.json();
          setUser({ ...data, username: userDetails.username });
          console.log("👤 Final resolved user with username:", userDetails.username);
        } catch (err) {
          console.error("Failed to fetch full user info:", err);
          setUser(data); // fallback without username
        }
      })
      .catch(console.error);
  }, []);


  useEffect(() => {
    if (!projectId || !user) return;
    fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(async team => {
        const me = team.find(m => String(m.userId) === String(user.id));
        setUserRole(me ? me.role : null);
        const nameMap = {};
        for (const member of team) {
          try {
            const res = await fetch(`/api/users/${member.userId}`, { credentials: 'include' });
            const data = await res.json();
            nameMap[member.userId] = data.username;
          } catch {
            nameMap[member.userId] = member.userId;
          }
        }
        setUserNames(nameMap);
      })
      .catch(console.error);
  }, [projectId, user]);

  /* ------------- folders & files ------------- */
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/folders/project/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(folds => {
        setFolders(folds);
        folds.forEach(f =>
          fetch(`/api/files?folderId=${f.id}`, { credentials: 'include' })
            .then(r => r.json())
            .then(files => setFilesByFolder(p => ({ ...p, [f.id]: files })))
            .catch(console.error)
        );
      })
      .catch(console.error);
  }, [projectId]);

  /* ------------- when a file is selected ------------- */
  useEffect(() => {
    if (!fileId) return;
    let meta = null;
    Object.values(filesByFolder).some(list => {
      const found = list.find(f => f.id === fileId);
      if (found) { meta = found; return true; }
      return false;
    });
    if (!meta) {
      setFilename('untitled.txt');
      setCode('');
      setSnapshots([]);
      return;
    }
    setFilename(meta.filename);
    setCurrentFolderId(meta.folderId);

    // latest code
    fetch(`/api/code/latest?fileId=${fileId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setCode(data ? data.content : ''))
      .catch(() => setCode(''));

    // all snapshots
    fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setSnapshots)
      .catch(err => {
        console.error('Error fetching snapshots:', err);
        setSnapshots([]);
      });
  }, [fileId, filesByFolder]);


  /* ------------- websocket connection ------------- */
  function connectWebSocket() {
    const socket = new SockJS('/ws');
    const stomp = over(socket);
    stomp.connect({}, () => {
      stomp.subscribe(`/topic/edit/${fileId}`, async (msg) => {
        const data = JSON.parse(msg.body);
  
        if (data.type === 'EDIT' && data.userId !== user?.id) {

          let username = userNames[data.userId];
  
          if (!username) {
            try {
              const res = await fetch(`/api/users/${data.userId}`, { credentials: 'include' });
              const userData = await res.json();
              username = userData.username;
              setUserNames(prev => ({ ...prev, [data.userId]: username }));
            } catch {
              username = data.userId;
            }
          }
  
          setEditNotification({ username, message: `${username} is editing this file...` });
          setTimeout(() => setEditNotification(null), 3000);
        }
  
        if (data.type === 'REFRESH' && data.userId !== user?.id) {
          // Someone else saved or ran code — refetch latest
          const [newSnaps, latest] = await Promise.all([
            fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' })
              .then(r => r.ok ? r.json() : []),
            fetch(`/api/code/latest?fileId=${fileId}`, { credentials: 'include' })
              .then(r => r.ok ? r.json() : { content: '' })
          ]);
          setSnapshots(newSnaps);
          setCode(latest.content || '');
          setOutput('// Refreshed after update from another user');
        }
      });
  
      // Send SUBSCRIBE message on connect
      stomp.send("/app/edit", {}, JSON.stringify({
        type: 'SUBSCRIBE',
        fileId,
        userId: user?.id
      }));
    });
    setStompClient(stomp);
  }
  
  
  // Connect on user+fileId ready
  useEffect(() => {
    if (user && fileId) connectWebSocket();
  }, [user, fileId]);
  


  async function handleRevert(snap) {
    if (!window.confirm(`Revert to snapshot #${snap.id}?`)) return;
  
    try {
      const timestamp = snap.timestamp.split('.')[0].replace('T', ' ');
      const params = new URLSearchParams({
        projectId,
        fileId,
        filename,
        timestamp
      });
  
      const res = await fetch(`/api/code/snapshot-content?${params.toString()}`, {
        credentials: 'include'
      });
  
      if (!res.ok) throw new Error(await res.text());
  
      const snapshotCode = await res.text();
  
      // Save reverted snapshot
      const saveRes = await fetch('/api/code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          folderId: currentFolderId,
          summary: snap.summary,
          code: snapshotCode
        })
      });
  
      if (!saveRes.ok) throw new Error(await saveRes.text());
  
      // Refresh local view
      const [newSnaps, latest] = await Promise.all([
        fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/code/latest?fileId=${fileId}`, { credentials: 'include' }).then(r => r.json())
      ]);
  
      setSnapshots(newSnaps);
      setCode(latest.content || '');
  
      // 🔁 Notify others to refresh
      if (stompClient && stompClient.connected) {
        stompClient.send("/app/edit", {}, JSON.stringify({
          type: 'REFRESH',
          fileId,
          userId: user?.id
        }));
      }
  
    } catch (err) {
      alert('Failed to revert snapshot: ' + err.message);
    }
  }
  
  const handleFork = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/fork`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const newProject = await res.json();
      navigate(`/project/${newProject.id}`);
    } catch (err) {
      alert("Fork failed: " + err.message);
    }
  };

  const handleMerge = async () => {
    const otherId = window.prompt("Enter project ID to merge with:");
    if (!otherId || isNaN(Number(otherId))) return alert("Invalid ID");
  
    try {
      const res = await fetch(`/api/projects/${projectId}/merge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherProjectId: Number(otherId) }),
      });
  
      if (!res.ok) throw new Error(await res.text());
      const newProject = await res.json();
      navigate(`/project/${newProject.id}`);
    } catch (err) {
      alert("Merge failed: " + err.message);
    }
  };
  

  const handleClone = () => {
    window.location.href = `/api/projects/${projectId}/download`;
  };
  



  /* ------------- helpers ------------- */
  async function saveSnapshot(summaryText) {
    const res = await fetch('/api/code', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename || 'untitled.txt',
        code,
        folderId: currentFolderId,
        summary: summaryText
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  const handleSave = () => {
    const summary = window.prompt("Snapshot summary:", "");
    if (summary === null) return;
    saveSnapshot(summary)
    .then(() => {
      
      if (stompClient && stompClient.connected) {
        stompClient.send("/app/edit", {}, JSON.stringify({
          type: 'REFRESH',
          fileId,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        }));
      }
      return fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' });
    })
    .then(r => r.ok ? r.json() : [])
    .then(setSnapshots)
    .catch(e => alert(e.message));
  };

  const handleRun = () => {
    const summary = window.prompt("Snapshot summary (will be executed):", "");
    if (summary === null) return;
  
    saveSnapshot(summary)
      .then(async ({ fileId: fid, snapshotName }) => {
        if (stompClient && stompClient.connected) {
          stompClient.send("/app/edit", {}, JSON.stringify({
            type: 'REFRESH',
            fileId: fid,
            userId: user?.id,
            timestamp: new Date().toISOString(),
          }));
        }
  
        const snaps = await fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' })
                           .then(r => r.ok ? r.json() : []);
        setSnapshots(snaps);
  
        const r = await fetch(
          `/api/execute?fileId=${fid}&snapshotName=${encodeURIComponent(snapshotName)}`,
          { method: 'POST', credentials: 'include' }
        );
        setOutput(await r.text());
      })
      .catch(e => setOutput('Execution failed: ' + e.message));
  };

  async function fetchDiff({ fileId, projectId, filename, current, previous }) {
    const params = new URLSearchParams({
      fileId,
      filename,
      projectId,
      current,
    });
    if (previous) params.append("previous", previous);
    const res = await fetch(`/api/code/diff?${params.toString()}`, {
      credentials: 'include'
    });
    if (!res.ok) return ["Failed to fetch diff."];
    return await res.json();
  }

    function toggleSnapshot(id) {
        setExpandedSnapshots(prev => ({ ...prev, [id]: !prev[id] }));
        const index = snapshots.findIndex(sn => sn.id === id);
        const snap  = snapshots[index];    
        // build the space‑separated timestamps just like the backend expects
        const currTs = snap.timestamp
          .split('.')[0]       // drop fractional seconds
          .replace('T', ' ');   // "2025-04-17T23:06:33" → "2025-04-17 23:06:33"
    
        const prevTs = index > 0
          ? snapshots[index - 1].timestamp.split('.')[0].replace('T', ' ')
          : null;
    
        console.log("💥 Fetching diff with:", { fileId, filename, projectId, current: currTs, previous: prevTs });
    
        if (!snapshotDiffs[id]) {
          fetchDiff({ fileId, filename, projectId, current: currTs, previous: prevTs })
            .then(diff => setSnapshotDiffs(d => ({ ...d, [id]: diff })));
        }
      }

      function handleEditInput(e) {
        const newText = e.target.value;
        setCode(newText);
        if (stompClient && stompClient.connected) {
          stompClient.send("/app/edit", {}, JSON.stringify({
            type: 'EDIT',
            fileId,
            userId: user?.id,
            isSender: true,
            timestamp: new Date().toISOString(),
            text: newText
          }));
        }
        console.log("👤 Logged in username:", user?.username);
        console.log("📢 EditNotification:", editNotification);
      }

  const [project, setProject] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setProject)
      .catch(console.error);
  }, [projectId]);

  // Guard
  if (!user || userRole === null)
    return <div style={{ padding: 40 }}>You are not a member of this project.</div>;

  const canEdit    = userRole === 'admin' || userRole === 'editor';
  const topFolders = folders.filter(f => f.parentId == null);

  /* ───────────────────────── render ───────────────────────────── */
  return (
    

    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #ccc' }}>
      <div>
        <h2 style={{ margin: 0 }}>{project?.name || "Project"}</h2>
      </div>
      {editNotification && editNotification.username !== user?.username && (
        <div style={{ background: '#fffae6', padding: 5, marginBottom: 10, color: '#333', borderRadius: 4 }}>
          {editNotification.message}
        </div>
      )}

      <div>
        <button onClick={() => navigate(`/project/${projectId}`)} style={{ marginRight: 10 }}>Back</button>
        <button onClick={() => navigate("/")}>Home</button>
      </div>
    </div>
      {/* upper */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* file tree */}
        <div style={{ width: '20%', borderRight: '1px solid #ccc', overflowY: 'auto', padding: 10 }}>
          <h3>Files</h3>
          <ul>
            {topFolders.map(f => (
              <FolderTree
                key={f.id}
                folder={f}
                allFolders={folders}
                filesByFolder={filesByFolder}
                projectId={projectId}
              />
            ))}
          </ul>
          <div style={{ marginBottom: 20 }}>
          <button onClick={handleFork} style={{ marginRight: 10 }}>Fork</button>
          <button onClick={handleClone} style={{ marginRight: 10 }}>Clone</button>
            <button onClick={handleMerge} style={{ marginLeft: 10 }}>Merge</button>
          </div>

        </div>

        {/* editor */}
        <div style={{ width: '60%', padding: 10 }}>
          <h3>Editor {filename && `– ${filename}`}</h3>
          <textarea
            style={{ width: '100%', height: '70%', fontFamily: 'monospace' }}
            value={code}
            onChange={handleEditInput}
            disabled={!canEdit}
          />
          {canEdit && (
            <div style={{ marginTop: 10 }}>
              <button onClick={handleSave}>Save</button>
              <button onClick={handleRun} style={{ marginLeft: 10 }}>Run</button>
            </div>
          )}
        </div>

        {/* version control */}
        <div style={{
          width: '20%',
          borderLeft: '1px solid #ccc',
          padding: 10,
          overflowY: 'auto',
          height: 'calc(100vh - 300px)'
        }}>
          <h3>Version Control</h3>
          {snapshots.length === 0 ? (
            <p>No snapshots yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {snapshots.map(s => (
                <li key={s.id} style={{ marginBottom: 8 }}>
                  <div
                    onClick={() => toggleSnapshot(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f0f0f0',
                      color: '#000',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ marginRight: 8 }}>
                      {expandedSnapshots[s.id] ? '–' : '+'}
                    </span>
                    <span style={{ fontWeight: 'bold', marginRight: 8 }}>
                      {s.id}
                    </span>
                    <span style={{ marginRight: 8 }}>{s.author}</span>
                    <span style={{ marginRight: 8, fontSize: '0.9em', color: '#555' }}>
                      {formatTimestamp(s.timestamp)}
                    </span>
                    <span style={{ flex: 1, fontStyle: 'italic' }}>
                      {s.summary}
                    </span>
                    {snapshots[snapshots.length - 1]?.id === s.id ? (
                        <span style={{ marginLeft: 8, color: '#888', fontSize: '0.9em' }}>working here</span>
                      ) : (
                        canEdit ? (
                          <button onClick={() => handleRevert(s)} style={{ marginLeft: 8 }}>Revert</button>
                        ) : (
                          <button disabled style={{ marginLeft: 8, opacity: 0.5, cursor: 'not-allowed' }}>Revert</button>
                        )
                    )}
                    </div>
                    {expandedSnapshots[s.id] && (
                      <div style={{
                       marginLeft: 24,
                        marginTop: 4,
                        padding: '4px',
                        background: '#f9f9f9',
                        fontSize: '0.9em',
                        borderRadius: '4px'
                      }}>
                        {snapshotDiffs[s.id] ? (
                          snapshotDiffs[s.id].map((line, idx) => {
                            const color = line.startsWith('+') 
                              ? 'green'
                              : line.startsWith('-')
                              ? 'red'
                              : 'grey';
                            return (
                              <div 
                                key={idx}
                                style={{ 
                                  fontFamily: 'monospace', 
                                  whiteSpace: 'pre-wrap', 
                                  color 
                                }}
                              >
                                {line}
                              </div>
                            );
                          })
                        ) : (
                          <span>Loading diff...</span>
                        )}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* console */}
      <div style={{
        height: '20%',
        borderTop: '1px solid #ccc',
        padding: 10,
        overflowY: 'auto'
      }}>
        <h3>Console</h3>
        <pre>{output || '// Output will appear here …'}</pre>
      </div>
    </div>
  );
}
