import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatFileName(name) {
  const parts = name.split('_');
  const last  = parts[parts.length - 1];
  return /^\d+$/.test(last) ? parts.slice(0, -1).join('_') : name;
}

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

/* ─────────────────────────── Page ────────────────────────────── */

export default function DynamicCodeEditorPage() {
  const { projectId, fileId } = useParams();
  const navigate               = useNavigate();

  /* ------------- state ------------- */
  const [user, setUser]                 = useState(null);
  const [userRole, setUserRole]         = useState(null);
  const [folders, setFolders]           = useState([]);
  const [filesByFolder, setFilesByFolder] = useState({});
  const [filename, setFilename]         = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const [code, setCode]     = useState('');
  const [output, setOutput] = useState('');

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

    /* locate metadata in our cached lists */
    let meta = null;
    Object.values(filesByFolder).some(list => {
      const found = list.find(f => f.id === fileId);
      if (found) { meta = found; return true; }
      return false;
    });

    if (!meta) { setFilename('untitled.txt'); setCode(''); return; }

    setFilename(meta.filename);
    setCurrentFolderId(meta.folderId);

    /* pull latest snapshot */
    fetch(`/api/code/latest?fileId=${fileId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setCode(data ? data.content : ''))
      .catch(() => setCode(''));
  }, [fileId, filesByFolder]);

  /* ------------- helpers ------------- */

  async function saveSnapshot() {
    const res = await fetch('/api/code', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename || 'untitled.txt',
        code,
        folderId: currentFolderId
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const handleSave = () =>
    saveSnapshot().then(s => console.log('Snapshot:', s.snapshotName))
                  .catch(e => alert(e.message));

  const handleRun = () =>
    saveSnapshot()
      .then(async ({ fileId: fid, snapshotName }) => {
        const r = await fetch(
          `/api/execute?fileId=${fid}&snapshotName=${encodeURIComponent(snapshotName)}`,
          { method: 'POST', credentials: 'include' }
        );
        setOutput(await r.text());
      })
      .catch(e => setOutput('Execution failed: ' + e.message));

  /* ------------- guards ------------- */
  if (!user || userRole === null)
    return <div style={{ padding: 40 }}>You are not a member of this project.</div>;

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const topFolders = folders.filter(f => f.parentId == null);

  /* ------------- render ------------- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* upper section */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* left – tree */}
        <div style={{
          width: '20%',
          borderRight: '1px solid #ccc',
          overflowY: 'auto',
          padding: 10
        }}>
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

        {/* middle – editor */}
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

        {/* right – stub for future version history */}
        <div style={{
          width: '20%',
          borderLeft: '1px solid #ccc',
          overflowY: 'auto',
          padding: 10
        }}>
          <h3>Version Control</h3>
          <p>Coming soon…</p>
        </div>
      </div>

      {/* bottom – console */}
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
