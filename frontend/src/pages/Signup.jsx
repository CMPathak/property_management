import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  TextField,
  Typography,
  Paper,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Business as BusinessIcon, Google as GoogleIcon, Apple as AppleIcon, Visibility, VisibilityOff } from "@mui/icons-material";
import api from "../services/api";
import { toast } from "react-toastify";
import logoImg from "../assets/logo/accomax.png";
import heroImg from "../assets/hero_property_banner.png";
export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange",
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        email: data.email,
        password: data.password,
        full_name: data.fullName,
        phone_number: data.phone,
        role: data.role || "TENANT",
        is_active: true,
        is_verified: true,
      };

      const response = await api.post("/auth/signup", payload);

      if (response.status === 201 || response.status === 200) {
        toast.success("Account created successfully! Please log in.");
        navigate("/login");
      }
    } catch (err) {
      console.error("Signup failed:", err);
      let message = "Signup failed. Please try again.";
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d) => d.msg).join(", ");
        } else if (typeof detail === "object" && detail.message) {
          message = detail.message;
        }
      } else if (err.message) {
        message = err.message;
      }
      toast.error(message);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%" }} className="fade-in">
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
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <img src={logoImg} alt="Accoumaxx Logo" style={{ height: 48 }} />
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, tracking: "-0.02em", color: "#0F172A" }}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
            Sign up to start managing real estate, room allocations, and tenant ledgers.
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              margin="dense"
              required
              fullWidth
              id="fullName"
              label="Full Name"
              name="fullName"
              autoFocus
              {...register("fullName", { required: "Full name is required" })}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
              sx={{ mb: 1.5 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Please enter a valid email address",
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 1.5 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              id="phone"
              label="Phone Number"
              name="phone"
              {...register("phone", {
                required: "Phone number is required",
                pattern: {
                  value: /^(?:\+91|91|0)?[6-9]\d{9}$/,
                  message: "Please enter a valid 10-digit mobile number",
                },
              })}
              error={!!errors.phone}
              helperText={errors.phone?.message}
              sx={{ mb: 1.5 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              {...register("password", { required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } })}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 1.5 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
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
              Sign Up & Get Started
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3.5 }}>
            {"Already have an account? "}
            <Link component={RouterLink} to="/login" fontWeight={700} sx={{ textDecoration: "none", color: "#2563EB" }}>
              Log in
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
            src={heroImg}
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
            Build Your Property Empire
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
