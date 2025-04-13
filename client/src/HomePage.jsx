import React, { useState, useEffect } from 'react';

export default function HomePage() {
  // For demonstration, we'll simulate a logged-out state.
  // Later on, integrate actual authentication state.
  const [loggedIn, setLoggedIn] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // For now, if logged in, you could fetch the user's projects:
    if (loggedIn) {
      fetchProjects();
    }
  }, [loggedIn]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleLogin = () => {
    // Placeholder action for login.
    alert("Login action (to be implemented)");
  };

  const handleSignup = () => {
    // Placeholder action for signup.
    alert("Signup action (to be implemented)");
  };

  const handleCreateProject = () => {
    // Placeholder for creating a new project.
    alert("Create new project action (to be implemented)");
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>Welcome to Gitypon Hub</h1>
      <p>Edit with your team in real time!</p>
      {!loggedIn ? (
        <div>
          <button onClick={handleLogin} style={{ marginRight: '10px' }}>
            Login
          </button>
          <button onClick={handleSignup}>Signup</button>
        </div>
      ) : (
        <div>
          <h2>Your Projects</h2>
          {projects.length > 0 ? (
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  {project.name} (Owner: {project.owner})
                </li>
              ))}
            </ul>
          ) : (
            <p>No projects found.</p>
          )}
          <button onClick={handleCreateProject}>
            Create New Project
          </button>
        </div>
      )}
    </div>
  );
}
