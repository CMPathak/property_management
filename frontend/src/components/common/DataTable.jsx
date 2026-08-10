import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  TableSortLabel,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function DataTable({
  columns = [], // Array of { id, label, render, sortable }
  data = [],
  searchPlaceholder = "Search records...",
  title,
  actions = [], // Array of { label, icon, onClick }
  emptyMessage = "No data found.",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Filtered and Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          val != null && String(val).toLowerCase().includes(query)
        )
      );
    }

    // Sorting
    if (orderBy) {
      result.sort((a, b) => {
        const valA = a[orderBy] ?? "";
        const valB = b[orderBy] ?? "";
        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, orderBy, order]);

  // Paginated slice
  const paginatedData = useMemo(() => {
    return processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedData, page, rowsPerPage]);

  return (
    <Card sx={{ borderRadius: "16px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
      {/* Header & Controls Toolbar */}
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          borderBottom: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        {title && (
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {title}
          </Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: title ? 0 : 1 }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: "#F8FAFC",
              borderRadius: "10px",
              minWidth: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "& fieldset": { borderColor: "#E2E8F0" },
                "&:hover fieldset": { borderColor: "#CBD5E1" },
              },
            }}
          />
        </Box>
      </Box>

      {/* Table Container */}
      <TableContainer className="table-responsive-container" sx={{ width: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: { xs: 550, sm: 650 } }}>
          <TableHead sx={{ bgcolor: "#F8FAFC" }}>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || "left"}
                  sx={{
                    fontWeight: 700,
                    color: "#475569",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.75,
                    borderRight: "1px solid #E2E8F0",
                    borderBottom: "2px solid #E2E8F0",
                  }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : "asc"}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell align="center" sx={{ fontWeight: 700, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", borderRight: "1px solid #E2E8F0", borderBottom: "2px solid #E2E8F0" }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((row, idx) => (
              <TableRow
                key={row.id || idx}
                hover
                sx={{
                  "&:hover": { bgcolor: "rgba(248, 250, 252, 0.8)" },
                  transition: "background-color 0.15s ease",
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align || "left"} sx={{ py: 2, fontSize: "0.875rem", borderRight: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
                    {col.render ? col.render(row) : row[col.id]}
                  </TableCell>
                ))}

                {actions.length > 0 && (
                  <TableCell align="center" sx={{ py: 1, whiteSpace: "nowrap", borderRight: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      {actions.map((act, actIdx) => {
                        const isDelete = act.label?.toLowerCase().includes("delete");
                        return (
                          <Tooltip key={actIdx} title={act.label} arrow placement="top">
                            <IconButton
                              size="small"
                              onClick={() => act.onClick(row)}
                              sx={{
                                color: isDelete ? "#EF4444" : "#0284C7",
                                p: 0.5,
                                "&:hover": {
                                  bgcolor: isDelete ? "rgba(239, 68, 68, 0.08)" : "rgba(2, 132, 199, 0.08)",
                                },
                              }}
                            >
                              {act.icon}
                            </IconButton>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {processedData.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, processedData.length)} of {processedData.length} entries
        </Typography>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage=""
          sx={{ 
            ".MuiTablePagination-toolbar": { minHeight: "auto", p: 0 },
            ".MuiTablePagination-actions": { ml: 1 }
          }}
        />
      </Box>
    </Card>
  );
}
