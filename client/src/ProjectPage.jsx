import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [folders, setFolders] = useState([]);
  // Placeholder for files – later replace with a real API call if needed.
  const [files, setFiles] = useState([]);
  // For now, use hard-coded team data; later this can be fetched from your API.
  const [team, setTeam] = useState([]);
  // For demonstration, assume the current user is admin.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchFolders();
    fetchTeam();
    // Set isAdmin as appropriate (here, hard-coded to true)
    setIsAdmin(true);
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await fetch(`/api/folders/project/${projectId}`);
      const data = await res.json();
      setFolders(data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchTeam = async () => {
    // For now, dummy team data; later replace with API call.
    const dummyTeam = [
      { id: 1, name: 'Alice', role: 'Admin' },
      { id: 2, name: 'Bob', role: 'Editor' },
      { id: 3, name: 'Charlie', role: 'Viewer' }
    ];
    setTeam(dummyTeam);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Project: {project ? project.name : 'Loading Project...'}</h1>
      
      <section style={{ marginBottom: '20px' }}>
        <h2>Folder Structure</h2>
        {folders.length > 0 ? (
          <ul>
            {folders.map((folder) => (
              <li key={folder.id}>
                {folder.parentId ? '↳ ' : ''}{folder.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No folders available.</p>
        )}
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h2>Files</h2>
        {files.length > 0 ? (
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                {file.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>File listing coming soon...</p>
        )}
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h2>Team</h2>
        {team.length > 0 ? (
          <ul>
            {team.map((member) => (
              <li key={member.id}>
                {member.name} ({member.role})
              </li>
            ))}
          </ul>
        ) : (
          <p>No team members found.</p>
        )}
        {isAdmin && (
          <div>
            <button onClick={() => alert('Manage team functionality coming soon.')}>
              Manage Team
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
