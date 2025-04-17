import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

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

  /* ------------- auth / role ------------- */
  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(r => r.json()).then(setUser).catch(console.error);
  }, []);
  useEffect(() => {
    if (!projectId || !user) return;
    fetch(`/api/project-user-roles/project/${projectId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(team => {
        const me = team.find(m => String(m.userId) === String(user.id));
        setUserRole(me ? me.role : null);
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



  async function handleRevert(snap) {
    if (!window.confirm(`Revert to snapshot #${snap.id}?`)) return;
  
    try {
      // extract projectId, fileId, filename, timestamp from context and snapshot
      const timestamp = snap.timestamp.split('.')[0].replace('T', ' '); // formatted to match pattern
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
  
      // post it to save as a new snapshot
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
  
      // refresh everything
      const newSnaps = await fetch(`/api/code/snapshots?fileId=${fileId}`, {
        credentials: 'include'
      }).then(r => r.json());
  
      const latest = await fetch(`/api/code/latest?fileId=${fileId}`, {
        credentials: 'include'
      }).then(r => r.json());
  
      setSnapshots(newSnaps);
      setCode(latest.content || '');
  
    } catch (err) {
      alert('Failed to revert snapshot: ' + err.message);
    }
  }
  



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
      .then(() => fetch(`/api/code/snapshots?fileId=${fileId}`, { credentials: 'include' }))
      .then(r => r.ok ? r.json() : [])
      .then(setSnapshots)
      .catch(e => alert(e.message));
  };
  const handleRun = () => {
    const summary = window.prompt("Snapshot summary (will be executed):", "");
    if (summary === null) return;
    saveSnapshot(summary)
      .then(async ({ fileId: fid, snapshotName }) => {
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
  function toggleSnapshot(id) {
    setExpandedSnapshots(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Guard
  if (!user || userRole === null)
    return <div style={{ padding: 40 }}>You are not a member of this project.</div>;

  const canEdit    = userRole === 'admin' || userRole === 'editor';
  const topFolders = folders.filter(f => f.parentId == null);

  /* ───────────────────────── render ───────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

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
        </div>

        {/* editor */}
        <div style={{ width: '60%', padding: 10 }}>
          <h3>Editor {filename && `– ${filename}`}</h3>
          <textarea
            style={{ width: '100%', height: '70%', fontFamily: 'monospace' }}
            value={code}
            onChange={e => setCode(e.target.value)}
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
                        <button onClick={() => handleRevert(s)} style={{ marginLeft: 8 }}>Revert</button>
                      )}
                    </div>
                  {expandedSnapshots[s.id] && (
                    <div style={{
                      marginLeft: 24,
                      marginTop: 4,
                      padding: '4px',
                      background: '#f9f9f9',
                      color: '#333',
                      fontSize: '0.9em',
                      borderRadius: '4px'
                    }}>
                      {/* diff log placeholder */}
                      Change log placeholder...
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
