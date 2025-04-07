// src/App.js
import React, { useState } from 'react';

function App() {
  const [code, setCode] = useState("");
  const [response, setResponse] = useState("");

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/code', {  // /api/code will be routed via Nginx to the backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setResponse(data.message);
    } catch (error) {
      console.error(error);
      setResponse("Error saving code.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Collaborative Code Editor</h1>
      <textarea 
        rows="10"
        cols="50"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write your code here..."
      />
      <br />
      <button onClick={handleSubmit}>Save Code</button>
      <p>{response}</p>
    </div>
  );
}

export default App;
