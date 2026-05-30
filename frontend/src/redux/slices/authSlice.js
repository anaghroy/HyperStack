import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCurrentUser, logoutUser as apiLogoutUser, updateProfileAPI, updatePreferencesAPI, deleteAccountAPI } from '../../services/api';

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

export const updateUserProfile = createAsyncThunk('auth/updateUserProfile', async (formData, { rejectWithValue }) => {
  try {
    const data = await updateProfileAPI(formData);
    if (data && data.user) {
      return data.user;
    }
    return rejectWithValue('Failed to update profile');
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to update profile');
  }
});

export const updatePreferences = createAsyncThunk('auth/updatePreferences', async (preferences, { rejectWithValue }) => {
  try {
    const data = await updatePreferencesAPI(preferences);
    if (data && data.user) {
      return data.user;
    }
    return rejectWithValue('Failed to update preferences');
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to update preferences');
  }
});

export const deleteAccount = createAsyncThunk('auth/deleteAccount', async (_, { rejectWithValue }) => {
  try {
    await deleteAccountAPI();
    return null;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to delete account');
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
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setUser } = authSlice.actions;

export default authSlice.reducer;
