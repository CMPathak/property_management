import { createSlice } from "@reduxjs/toolkit";

const storedToken = localStorage.getItem("token");
const storedRefreshToken = localStorage.getItem("refresh_token");

let storedUser = null;
try {
  const item = localStorage.getItem("user");
  if (item && item !== "undefined") {
    storedUser = JSON.parse(item);
  }
} catch (e) {
  console.error("Failed to parse user from localStorage:", e);
  localStorage.removeItem("user");
}

const initialState = {
  token: storedToken || "demo-token",
  refreshToken: storedRefreshToken || "demo-refresh-token",
  user: storedUser || { full_name: "Ankush Mishra", role: "SUPER_ADMIN" },
  isAuthenticated: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { access_token, refresh_token, user } = action.payload;
      state.token = access_token;
      state.refreshToken = refresh_token;
      state.user = user;
      state.isAuthenticated = true;

      localStorage.setItem("token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    updateToken: (state, action) => {
      const { access_token, refresh_token } = action.payload;
      state.token = access_token;
      localStorage.setItem("token", access_token);
      if (refresh_token) {
        state.refreshToken = refresh_token;
        localStorage.setItem("refresh_token", refresh_token);
      }
    },
    logOut: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;

      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    },
  },
});

export const { setCredentials, updateToken, logOut } = authSlice.actions;
export default authSlice.reducer;
export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectCurrentRefreshToken = (state) => state.auth.refreshToken;
