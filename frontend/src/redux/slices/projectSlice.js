import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeProject: null,
  sandboxId: null,
  isAIChatOpen: false,
  aiInitialMessage: null,
  aiExplainRequest: null,
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
    setAiExplainRequest: (state, action) => {
      state.aiExplainRequest = action.payload;
    },
  },
});

export const { 
  setActiveProject, 
  setSandboxId, 
  setIsAIChatOpen, 
  setAiInitialMessage,
  setAiExplainRequest
} = projectSlice.actions;

export default projectSlice.reducer;
