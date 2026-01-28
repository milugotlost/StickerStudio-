import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Project } from './types';

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
  };

  const handleBackToDashboard = () => {
    setCurrentProject(null);
  };

  const handleUpdateProject = (updated: Project) => {
    setCurrentProject(updated);
  };

  return (
    <>
      {!currentProject ? (
        <Dashboard onOpenProject={handleOpenProject} />
      ) : (
        <Editor 
            project={currentProject} 
            onBack={handleBackToDashboard}
            onUpdateProject={handleUpdateProject}
        />
      )}
    </>
  );
}

export default App;