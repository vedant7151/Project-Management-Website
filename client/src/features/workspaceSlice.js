import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchWorkspaces = createAsyncThunk(
    'workspace/fetchWorkspaces', 
    async ({ getToken }, { rejectWithValue }) => {
        try {
            // 1. Get the token correctly first (Wait for the promise!)
            const token = await getToken(); 

            const { data } = await api.get('/workspaces', {
                headers: { 
                    // 2. Use the resolved token variable
                    Authorization: `Bearer ${token}` 
                }
            });
            return data.workspaces || [];
        } catch (error) {
            // console.log(error);
            return rejectWithValue(error.response?.data?.message || "Failed to fetch workspaces");
        }
    }
);
const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    error: null, // <--- ADDED THIS TO TRACK ERRORS
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },

    setCurrentWorkspace: (state, action) => {
      localStorage.setItem("currentWorkspaceId", action.payload);
      state.currentWorkspace = state.workspaces.find(
        (w) => w.id === action.payload
      );
    },

    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);

      if (state.currentWorkspace?.id !== action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },

    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w
      );

      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },

    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(
        (w) => w.id !== action.payload
      );
    },

    addProject: (state, action) => {
      // Guard: only push if payload is a valid object
      if (state.currentWorkspace && action.payload) {
        // Ensure tasks array exists
        const project = { tasks: [], ...action.payload };
        state.currentWorkspace.projects.push(project);
      }
    },

    addTask: (state, action) => {
      // Immer automatically syncs these changes to the proxy array in state.workspaces
      const project = state.currentWorkspace?.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.tasks.push(action.payload);
      }
    },

    updateTask: (state, action) => {
      const project = state.currentWorkspace?.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        const taskIndex = project.tasks.findIndex(t => t.id === action.payload.id);
        if (taskIndex !== -1) {
          project.tasks[taskIndex] = action.payload;
        }
      }
    },

    deleteTask: (state, action) => {
      state.currentWorkspace?.projects.forEach(p => {
        p.tasks = p.tasks.filter(t => !action.payload.includes(t.id));
      });
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      // Sanitize: strip any undefined entries from projects and their tasks arrays
      const sanitized = (action.payload || []).map((w) => ({
        ...w,
        projects: (w.projects || []).filter(Boolean).map((p) => ({
          ...p,
          tasks: (p.tasks || []).filter(Boolean),
        })),
      }));

      state.workspaces = sanitized;

      if (state.workspaces.length > 0) {
        const storedId = localStorage.getItem("currentWorkspaceId");

        if (storedId) {
          // Use state.workspaces (Immer proxy) so mutations via addProject stay in sync
          const found = state.workspaces.find((w) => w.id == storedId);
          state.currentWorkspace = found || state.workspaces[0];
        } else {
          state.currentWorkspace = state.workspaces[0];
        }
      }

      state.loading = false;
    });

    builder.addCase(fetchWorkspaces.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Failed to fetch workspaces"; // ← this breaks the re-fetch loop
    });
  },
});

// Export all your actions
export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;