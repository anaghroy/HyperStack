import React from 'react';

const Overview = () => {
  return (
    <div className="overview-container">
      <div className="overview-header">
        <h1>Platform Documentation</h1>
        <p>
          Welcome to HyperStack, the premium AI-powered development environment. Our platform
          provides institutional-grade tools to build, manage, and scale your mission-critical applications.
        </p>
      </div>

      <div className="core-capabilities-section">
        <h2>Core Capabilities</h2>
        
        <div className="capabilities-grid">
          <div className="capability-card">
            <h3>MULTI-AGENT AI</h3>
            <p>Intelligent orchestration of coding, reviewing, and fixing tasks by autonomous AI agents.</p>
          </div>
          
          <div className="capability-card">
            <h3>KUBERNETES SANDBOX</h3>
            <p>Isolated, containerized environments for secure real-time execution and testing.</p>
          </div>
          
          <div className="capability-card">
            <h3>INTEGRATED IDE</h3>
            <p>A comprehensive, context-aware editor paired directly with an intelligent chat interface.</p>
          </div>
          
          <div className="capability-card">
            <h3>SEMANTIC SEARCH</h3>
            <p>Instant, intelligent navigation across your entire codebase powered by vector embeddings.</p>
          </div>
          
          <div className="capability-card">
            <h3>PROJECT MEMORY</h3>
            <p>Persistent timeline and context retention that helps the AI understand your project's evolution.</p>
          </div>
          
          <div className="capability-card">
            <h3>AUTO-FIX CAPABILITIES</h3>
            <p>Automatic error detection, linting resolution, and syntax fixing powered by AI.</p>
          </div>
          
          <div className="capability-card">
            <h3>GITHUB INTEGRATION</h3>
            <p>Seamlessly connect repositories and import live codebases with zero friction.</p>
          </div>
          
          <div className="capability-card">
            <h3>SHARED WORKSPACES</h3>
            <p>Collaborate securely with your team on shared projects and live codebases.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
