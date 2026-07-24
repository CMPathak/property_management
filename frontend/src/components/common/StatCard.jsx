import React from "react";
import { Card, CardContent, Box, Typography, Avatar } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: IconComponent,
  iconBg = "rgba(37, 99, 235, 0.1)",
  iconColor = "#2563EB",
  trend,
  trendType = "up", // 'up' | 'down' | 'neutral'
}) {
  const isUp = trendType === "up";
  const isDown = trendType === "down";

  const valString = String(value || "");
  const isLong = valString.length > 14;
  const isVeryLong = valString.length > 20;

  const dynamicFontSize = isVeryLong
    ? { xs: "0.95rem", sm: "1.05rem", md: "1.15rem" }
    : isLong
    ? { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" }
    : { xs: "1.25rem", sm: "1.4rem", md: "1.55rem" };

  return (
    <Card
      className="saas-card-hover"
      sx={{
        borderRadius: "16px",
        height: "100%",
        bgcolor: "background.paper",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.25 }, "&:last-child": { pb: { xs: 2, sm: 2.25 } } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: "0.75rem", sm: "0.825rem" } }}>
            {title}
          </Typography>
          <Avatar
            sx={{
              bgcolor: iconBg,
              color: iconColor,
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {IconComponent && <IconComponent sx={{ fontSize: { xs: 18, sm: 20 } }} />}
          </Avatar>
        </Box>

        <Typography
          fontWeight={700}
          sx={{
            color: "text.primary",
            mb: 0.5,
            tracking: "-0.02em",
            fontSize: dynamicFontSize,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.25,
          }}
        >
          {value}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {trend && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
                px: 1,
                py: 0.25,
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                bgcolor: isUp ? "rgba(34, 197, 94, 0.1)" : isDown ? "rgba(239, 68, 68, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: isUp ? "#22C55E" : isDown ? "#EF4444" : "#64748B",
              }}
            >
              {isUp && <TrendingUpIcon sx={{ fontSize: 14 }} />}
              {isDown && <TrendingDownIcon sx={{ fontSize: 14 }} />}
              {trend}
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
