import React from "react";
import { Card, CardContent, Box, Typography, Button, Chip } from "@mui/material";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function WelcomeBanner({
  name = "User",
  role = "OWNER",
  title = "Welcome back",
  subtitle = "Here is what's happening across your property portfolio today.",
  actions = [],
}) {
  const isOwner = role === "OWNER";

  return (
    <Card
      sx={{
        borderRadius: "14px",
        background: isOwner
          ? "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)"
          : "linear-gradient(135deg, #1E3A8A 0%, #1E293B 100%)",
        color: "#FFFFFF",
        mb: 2.5,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 6px 18px -4px rgba(15, 23, 42, 0.2)",
      }}
    >
      {/* Background Decorative Circles */}
      <Box
        sx={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <CardContent sx={{ p: { xs: 2, sm: 2.25, md: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.25, md: 2.5 } } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ maxWidth: 600 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
              <Chip
                icon={<SparklesIcon sx={{ fontSize: "12px !important", color: "#60A5FA" }} />}
                label={role}
                size="small"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "#93C5FD",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 22,
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              />
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </Typography>
            </Box>

            <Typography variant="h5" fontWeight={800} sx={{ color: "#FFFFFF", mb: 0.25, tracking: "-0.02em", fontSize: { xs: "1.15rem", sm: "1.35rem", md: "1.5rem" } }}>
              {title}, {name}!
            </Typography>

            <Typography variant="body2" sx={{ color: "#94A3B8", lineHeight: 1.4, fontSize: { xs: "0.775rem", sm: "0.825rem" } }}>
              {subtitle}
            </Typography>
          </Box>

          {actions.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
              {actions.map((act, index) => (
                <Button
                  key={index}
                  variant={act.variant || "contained"}
                  color={act.color || "primary"}
                  onClick={act.onClick}
                  startIcon={act.icon}
                  endIcon={act.endIcon || <ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    borderRadius: "8px",
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    bgcolor: act.variant === "outlined" ? "transparent" : "#2563EB",
                    borderColor: "rgba(255,255,255,0.3)",
                    color: "#FFFFFF",
                    "&:hover": {
                      bgcolor: act.variant === "outlined" ? "rgba(255,255,255,0.1)" : "#1D4ED8",
                    },
                  }}
                >
                  {act.label}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
