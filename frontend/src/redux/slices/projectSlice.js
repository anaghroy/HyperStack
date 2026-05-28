import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeProject: null,
  sandboxId: null,
  isAIChatOpen: false,
  aiInitialMessage: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setActiveProject: (state, action) => {
      state.activeProject = action.payload;
    },
    setSandboxId: (state, action) => {
      state.sandboxId = action.payload;
    },
    setIsAIChatOpen: (state, action) => {
      state.isAIChatOpen = action.payload;
    },
    setAiInitialMessage: (state, action) => {
      state.aiInitialMessage = action.payload;
    },
  },
});

export const { 
  setActiveProject, 
  setSandboxId, 
  setIsAIChatOpen, 
  setAiInitialMessage 
} = projectSlice.actions;

export default projectSlice.reducer;
