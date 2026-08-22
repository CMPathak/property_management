import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#10B981", // AccoMaxx Emerald Green #10B981
      light: "#34D399",
      dark: "#059669",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#4F46E5",
      light: "#6366F1",
      dark: "#3730A3",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#FFFFFF", // Clean light SaaS background
      paper: "#FFFFFF",   // White cards
    },
    text: {
      primary: "#0F172A",
      secondary: "#64748B",
    },
    success: {
      main: "#22C55E", // Success #22C55E
    },
    warning: {
      main: "#F59E0B", // Warning #F59E0B
    },
    error: {
      main: "#EF4444", // Error #EF4444
    },
    divider: "#E2E8F0",
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: "2.5rem", fontWeight: 700, tracking: "-0.02em" },
    h2: { fontSize: "2rem", fontWeight: 700, tracking: "-0.02em" },
    h3: { fontSize: "1.75rem", fontWeight: 600, tracking: "-0.01em" },
    h4: { fontSize: "1.5rem", fontWeight: 600, tracking: "-0.01em" },
    h5: { fontSize: "1.25rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    body1: { fontSize: "0.875rem", lineHeight: 1.5 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.45 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 16, // Border radius 16px
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Border radius 16px
          backgroundColor: "#FFFFFF", // White cards
          boxShadow: "0px 4px 20px rgba(15, 23, 42, 0.04), 0px 1px 3px rgba(15, 23, 42, 0.02)", // Soft shadow
          border: "1px solid #E2E8F0",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "8px 20px",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 4px 12px rgba(37, 99, 235, 0.2)",
          },
        },
        containedPrimary: {
          backgroundColor: "#2563EB",
          "&:hover": {
            backgroundColor: "#1D4ED8",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: "0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F8FAFC",
          "& .MuiTableCell-head": {
            color: "#475569",
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: "1px solid #E2E8F0",
            whiteSpace: "nowrap",
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          overflow: "hidden",
        },
        toolbar: {
          flexWrap: "wrap",
          paddingLeft: 8,
          paddingRight: 8,
          justifyContent: "center",
          gap: 4,
          "@media (min-width:600px)": {
            justifyContent: "flex-end",
            paddingLeft: 16,
            paddingRight: 16,
          },
        },
        spacer: {
          display: "none",
          "@media (min-width:600px)": {
            display: "block",
          },
        },
        selectLabel: {
          fontSize: "0.8125rem",
        },
        displayedRows: {
          fontSize: "0.8125rem",
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#1D4ED8",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#6366F1",
      light: "#818CF8",
      dark: "#4F46E5",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#0B0F19",
      paper: "#111827",
    },
    text: {
      primary: "#F8FAFC",
      secondary: "#94A3B8",
    },
    success: {
      main: "#22C55E",
    },
    warning: {
      main: "#F59E0B",
    },
    error: {
      main: "#EF4444",
    },
    divider: "#1F2937",
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "none",
          backgroundImage: "none",
          border: "1px solid #1F2937",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "8px 20px",
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#111827",
          "& .MuiTableCell-head": {
            color: "#94A3B8",
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
        },
      },
    },
  },
});
