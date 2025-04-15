import React from 'react';

export default function HomePage() {

  const handleOAuthLogin = () => {
    // This URL invokes Spring Security's OAuth2 client flow with GitHub.
    window.location.href = "http://localhost:8080/oauth2/authorization/github";
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>Welcome to Gitypon Hub</h1>
      <p>Edit with your team in real time!</p>
      <button onClick={handleOAuthLogin}>Login / Signup with GitHub</button>
    </div>
  );
}
