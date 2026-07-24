import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Beds() {
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [bedToEdit, setBedToEdit] = useState(null);
  const [bedToView, setBedToView] = useState(null);

  // Form State
  const [newBedNumber, setNewBedNumber] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Edit Form State
  const [editBedNumber, setEditBedNumber] = useState("");
  const [editBedStatus, setEditBedStatus] = useState("VACANT");

  const fetchData = async () => {
    try {
      const propertiesRes = await api.get("/properties/");
      let allRooms = [];
      let allBeds = [];

      propertiesRes.data.forEach((p) => {
        if (p.floors) {
          p.floors.forEach((f) => {
            if (f.rooms) {
              f.rooms.forEach((r) => {
                allRooms.push(r);
                if (r.beds) {
                  r.beds.forEach((b) => {
                    allBeds.push({ ...b, room_number: r.room_number, room_id: r.id, base_rent: r.base_rent });
                  });
                }
              });
            }
          });
        }
      });

      setRooms(allRooms);
      setBeds(allBeds);
    } catch (err) {
      console.error("Failed to load beds:", err);
      setRooms([]);
      setBeds([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || "Failed to process request.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join(".") || "Field"}: ${e.msg}`).join("\n");
    }
    return JSON.stringify(detail);
  };

  const handleAddBed = async () => {
    if (!selectedRoomId) {
      alert("Please select a room.");
      return;
    }
    try {
      const payload = {
        bed_number: newBedNumber,
        status: "VACANT",
        room_id: selectedRoomId,
      };
      await api.post("/beds/", payload);
      setOpenAddDialog(false);
      setNewBedNumber("");
      setSelectedRoomId("");
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (b) => {
    setBedToEdit(b);
    setEditBedNumber(b.bed_number);
    setEditBedStatus(b.status);
    setOpenEditDialog(true);
  };

  const handleEditBed = async () => {
    try {
      const payload = {
        bed_number: editBedNumber,
        status: editBedStatus,
      };
      await api.put(`/beds/${bedToEdit.id}`, payload);
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenView = (b) => {
    setBedToView(b);
    setOpenViewDialog(true);
  };

  const handleToggleBedStatus = async (b) => {
    const nextStatus = b.status === "VACANT" || b.status === "OCCUPIED" ? "MAINTENANCE" : "VACANT";
    setBeds((prev) => prev.map((item) => (item.id === b.id ? { ...item, status: nextStatus } : item)));
    try {
      await api.put(`/beds/${b.id}`, { status: nextStatus, bed_number: b.bed_number });
      fetchData();
    } catch (err) {
      console.error(err);
      setBeds((prev) => prev.map((item) => (item.id === b.id ? { ...item, status: b.status } : item)));
      alert(formatError(err));
    }
  };

  const handleDeleteBed = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bed?")) return;
    try {
      await api.delete(`/beds/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const columns = [
    {
      id: "bed_number",
      label: "Bed No.",
      render: (b) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => handleOpenView(b)}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          Bed {b.bed_number}
        </Typography>
      ),
    },
    {
      id: "room_number",
      label: "Room No.",
      render: (b) => `Room ${b.room_number}`,
    },
    {
      id: "tenant_name",
      label: "Tenant Assigned",
      render: (b) => b.tenant_name || "Unassigned",
    },
    {
      id: "status",
      label: "Bed Status",
      render: (b) => {
        const isVacant = b.status === "VACANT" || !b.status;
        const isOccupied = b.status === "OCCUPIED";
        return (
          <Chip
            label={b.status || "VACANT"}
            size="small"
            onClick={() => handleToggleBedStatus(b)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: isVacant
                ? "rgba(34, 197, 94, 0.12)"
                : isOccupied
                ? "rgba(37, 99, 235, 0.12)"
                : "rgba(245, 158, 11, 0.12)",
              color: isVacant ? "#16A34A" : isOccupied ? "#2563EB" : "#D97706",
              "&:hover": {
                bgcolor: isVacant
                  ? "rgba(34, 197, 94, 0.22)"
                  : isOccupied
                  ? "rgba(37, 99, 235, 0.22)"
                  : "rgba(245, 158, 11, 0.22)",
              },
            }}
          />
        );
      },
    },
    {
      id: "base_rent",
      label: "Monthly Rent",
      render: (b) => `₹${(b.base_rent || 0).toLocaleString("en-IN")}`,
    },
  ];

  const [bedFilter, setBedFilter] = useState("VACANT");

  const vacantBedsCount = beds.filter((b) => b.status === "VACANT" || !b.status).length;
  const occupiedBedsCount = beds.filter((b) => b.status === "OCCUPIED").length;

  const filteredBeds = beds.filter((b) => {
    if (bedFilter === "VACANT") return b.status === "VACANT" || !b.status;
    if (bedFilter === "OCCUPIED") return b.status === "OCCUPIED";
    return true;
  });

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Beds Roster
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage bed allocations, vacant bed capacity, and tenant assignment.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Add Bed
        </Button>
      </Box>

      {/* Filter Chips for Vacant / Empty Beds */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Chip
          label={`Vacant / Empty Beds (${vacantBedsCount})`}
          clickable
          color={bedFilter === "VACANT" ? "success" : "default"}
          onClick={() => setBedFilter("VACANT")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
        <Chip
          label={`All Beds (${beds.length})`}
          clickable
          color={bedFilter === "ALL" ? "primary" : "default"}
          onClick={() => setBedFilter("ALL")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
        <Chip
          label={`Occupied Beds (${occupiedBedsCount})`}
          clickable
          color={bedFilter === "OCCUPIED" ? "info" : "default"}
          onClick={() => setBedFilter("OCCUPIED")}
          sx={{ fontWeight: 700, borderRadius: "8px" }}
        />
      </Box>

      <DataTable
        columns={columns}
        data={filteredBeds}
        searchPlaceholder="Search by bed number, room, or tenant..."
        emptyMessage="No beds found matching filter."
        actions={[
          { label: "Edit Bed", icon: <CustomEditIcon fontSize="small" />, onClick: (b) => handleOpenEdit(b) },
          { label: "Toggle Status", icon: <CustomEyeIcon fontSize="small" />, onClick: (b) => handleToggleBedStatus(b) },
          { label: "Delete", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (b) => handleDeleteBed(b.id) },
        ]}
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Bed Details</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {bedToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="primary">
                Bed {bedToView.bed_number}
              </Typography>
              <Typography variant="body2">
                <b>Room:</b> Room {bedToView.room_number}
              </Typography>
              <Typography variant="body2">
                <b>Tenant:</b> {bedToView.tenant_name || "Unassigned"}
              </Typography>
              <Typography variant="body2">
                <b>Status:</b> {bedToView.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Bed</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="room-select-label">Select Room</InputLabel>
            <Select labelId="room-select-label" value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} label="Select Room">
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  Room {r.room_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Bed Label / Number"
            placeholder="e.g. 101-B"
            fullWidth
            variant="outlined"
            value={newBedNumber}
            onChange={(e) => setNewBedNumber(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddBed} variant="contained" color="primary">
            Save Bed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Bed</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            margin="dense"
            label="Bed Number"
            fullWidth
            variant="outlined"
            value={editBedNumber}
            onChange={(e) => setEditBedNumber(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="edit-bed-status-label">Status</InputLabel>
            <Select labelId="edit-bed-status-label" value={editBedStatus} onChange={(e) => setEditBedStatus(e.target.value)} label="Status">
              <MenuItem value="VACANT">VACANT</MenuItem>
              <MenuItem value="OCCUPIED">OCCUPIED</MenuItem>
              <MenuItem value="MAINTENANCE">MAINTENANCE</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditBed} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
