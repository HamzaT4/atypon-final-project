// src/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    fetch('/api/user-auth', { credentials: 'include' })
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Not authenticated');
      })
      .then(userData => {
        if (Object.keys(userData).length > 0) {
          setUser(userData);
          fetchMyProjects();
          fetchUserRoles(userData.id);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const fetchMyProjects = () => {
    fetch('/api/projects/mine', { credentials: 'include' })
      .then(res => res.json())
      .then(projectsData => setProjects(projectsData))
      .catch(err => console.error('Error fetching projects:', err));
  };

  const fetchUserRoles = (userId) => {
    fetch(`/api/project-user-roles/user/${userId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(rolesData => {
        const mapping = {};
        rolesData.forEach(role => {
          mapping[role.projectId] = role.role;
        });
        setUserRoles(mapping);
      })
      .catch(err => console.error('Error fetching user roles:', err));
  };

  const handleLogout = () => {
    fetch("http://localhost:8080/logout", {
      method: "POST",
      credentials: "include"
    })
      .then(response => {
        if (response.ok) {
          window.location.replace("/");
        } else {
          console.error("Logout failed");
        }
      })
      .catch(err => console.error("Error logging out:", err));
    window.location.reload();
  };

  const handleLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/github?flow=login";
  };

  const handleSignup = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/github?flow=signup";
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    fetch('/api/projects', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName })
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to create project");
        return res.json();
      })
      .then(() => {
        setNewProjectName('');
        fetchMyProjects();
      })
      .catch(err => {
        alert("Error: " + err.message);
      });
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1>Welcome to Gitypon Hub</h1>
        <p>Edit with your team in real time!</p>
        <button onClick={handleLogin} style={{ marginRight: '10px' }}>
          Login with GitHub
        </button>
        <button onClick={handleSignup}>
          Signup with GitHub
        </button>
      </div>
    );
  } else {
    return (
      <div style={{ padding: '40px' }}>
        <h1>Welcome, {user.login || user.username}!</h1>
        <button onClick={handleLogout} style={{ marginBottom: '20px' }}>Logout</button>

        <h2>Your Projects</h2>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            style={{ padding: '5px', marginRight: '10px' }}
          />
          <button onClick={handleCreateProject}>Create</button>
        </div>

        {projects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          <ul>
            {projects.map(project => (
              <li key={project.id}>
                <Link to={`/project/${project.id}`}>
                  {project.name} {userRoles[project.id] ? `- ${userRoles[project.id]}` : ''}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}
