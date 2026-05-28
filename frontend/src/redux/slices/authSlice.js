import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCurrentUser, logoutUser as apiLogoutUser } from '../../services/api';

// Async thunks
export const fetchUser = createAsyncThunk('auth/fetchUser', async (_, { rejectWithValue }) => {
  try {
    const data = await getCurrentUser();
    if (data && data.user) {
      return data.user;
    }
    return rejectWithValue('No user found');
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch user');
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { rejectWithValue }) => {
  try {
    await apiLogoutUser();
    return null;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to logout');
  }
});

const initialState = {
  user: null,
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { setUser } = authSlice.actions;

export default authSlice.reducer;
