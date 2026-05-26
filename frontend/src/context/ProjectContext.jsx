import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [activeProject, setActiveProject] = useState(null);
  const [sandboxId, setSandboxId] = useState(null);

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, sandboxId, setSandboxId }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
