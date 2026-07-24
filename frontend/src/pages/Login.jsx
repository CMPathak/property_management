import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
  Paper,
  Divider,
} from "@mui/material";
import { Business as BusinessIcon, Google as GoogleIcon, Apple as AppleIcon } from "@mui/icons-material";
import { setCredentials } from "../redux/authSlice";
import api from "../services/api";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setErrorMsg("");
      const formData = new URLSearchParams();
      formData.append("username", data.email);
      formData.append("password", data.password);

      const response = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (response.status === 200) {
        const token = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        const meResponse = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const loggedInUser = {
          id: meResponse.data.id,
          email: meResponse.data.email,
          full_name: meResponse.data.full_name || meResponse.data.email.split("@")[0].toUpperCase(),
          role: meResponse.data.role,
          designation: meResponse.data.designation || "",
        };

        dispatch(
          setCredentials({
            access_token: token,
            refresh_token: refreshToken,
            user: loggedInUser,
          })
        );

        navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("Failed to connect to authentication server. Please check if backend is running.");
      }
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%" }} className="fade-in">
      {/* Left Form panel */}
      <Box
        component={Paper}
        elevation={0}
        square
        sx={{
          flex: { xs: "1 1 100%", md: "0 0 45%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 2.5, sm: 4, md: 8 },
          py: { xs: 4, md: 6 },
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                bgcolor: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
              }}
            >
              <BusinessIcon sx={{ color: "#FFFFFF", fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#0F172A" tracking="-0.02em">
              ACCOUMAXX
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, tracking: "-0.02em", color: "#0F172A" }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            Log in to manage your property portfolio, rent ledgers, and resident operations.
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              {...register("email", { required: "Email is required" })}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...register("password", { required: "Password is required" })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5, mb: 3 }}>
              <FormControlLabel
                control={<Checkbox defaultChecked color="primary" sx={{ borderRadius: 1 }} />}
                label={<Typography variant="body2" fontWeight={500}>Remember me</Typography>}
              />
              <Link href="#" variant="body2" fontWeight={600} sx={{ textDecoration: "none", color: "#2563EB" }}>
                Forgot Password?
              </Link>
            </Box>

            {errorMsg && (
              <Typography variant="body2" color="error" sx={{ mb: 2.5, textAlign: "center", fontWeight: 600 }}>
                {errorMsg}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                py: 1.5,
                bgcolor: "#2563EB",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9375rem",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              Log In to Portal
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            {"Don't have an account? "}
            <Link component={RouterLink} to="/signup" fontWeight={700} sx={{ textDecoration: "none", color: "#2563EB" }}>
              Create an account
            </Link>
          </Typography>
        </Box>
      </Box>

      {/* Right Hero Panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: "1 1 55%",
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "#FFFFFF",
          p: 6,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 520 }}>
          <Box
            component="img"
            src="/hero_property_banner.png"
            alt="Modern Property Management Portal"
            sx={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
              mb: 3,
            }}
          />
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, color: "#FFFFFF", tracking: "-0.02em" }}>
            Enterprise Property Management
          </Typography>
          <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "1rem", lineHeight: 1.6 }}>
            Automate invoicing, track real-time payments, manage tenant agreements, and coordinate maintenance requests effortlessly.
          </Typography>
        </Box>
        <Box sx={{ position: "absolute", bottom: -120, right: -120, width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0) 70%)" }} />
      </Box>
    </Box>
  );
}
