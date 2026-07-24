import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Add as AddIcon, Business as BusinessIcon, Layers as LayersIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

export default function Floors() {
  const [floors, setFloors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [floorToEdit, setFloorToEdit] = useState(null);

  // Form states
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [editFloorNumber, setEditFloorNumber] = useState("");

  const fetchData = async () => {
    try {
      const propsRes = await api.get("/properties/");
      const propsData = Array.isArray(propsRes.data) ? propsRes.data : [];
      setProperties(propsData);

      let floorsList = [];
      propsData.forEach((p) => {
        if (p.floors && Array.isArray(p.floors)) {
          p.floors.forEach((f) => {
            const roomCount = f.rooms ? f.rooms.length : 0;
            floorsList.push({
              ...f,
              property_name: p.name,
              room_count: roomCount,
            });
          });
        }
      });
      setFloors(floorsList);
    } catch (err) {
      console.error("Failed to fetch floors data:", err);
      setFloors([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFloor = async () => {
    if (!selectedPropertyId) {
      alert("Please select a property.");
      return;
    }
    try {
      await api.post("/floors/", {
        property_id: selectedPropertyId,
        floor_number: parseInt(floorNumber) || 1,
      });
      setOpenAddDialog(false);
      setFloorNumber("");
      setSelectedPropertyId("");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create floor.");
    }
  };

  const handleOpenEdit = (f) => {
    setFloorToEdit(f);
    setEditFloorNumber(f.floor_number);
    setOpenEditDialog(true);
  };

  const handleEditFloor = async () => {
    try {
      await api.put(`/floors/${floorToEdit.id}`, {
        floor_number: parseInt(editFloorNumber) || 1,
      });
      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update floor.");
    }
  };

  const columns = [
    {
      id: "floor_number",
      label: "Floor Name / Number",
      render: (f) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LayersIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700}>
            Floor {f.floor_number}
          </Typography>
        </Box>
      ),
    },
    {
      id: "property_name",
      label: "Property Name",
      render: (f) => (
        <Typography variant="body2" fontWeight={600}>
          {f.property_name || "Main Property"}
        </Typography>
      ),
    },
    {
      id: "room_count",
      label: "Total Rooms",
      render: (f) => <Chip label={`${f.room_count || 0} Rooms`} size="small" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "status",
      label: "Status",
      render: () => <Chip label="ACTIVE" size="small" color="success" sx={{ borderRadius: "6px" }} />,
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Floors Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage floor structures, room capacity, and property floor plans.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
          Add Floor
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={floors}
        searchPlaceholder="Search floors or property name..."
        emptyMessage="No floors configured yet. Click 'Add Floor' to create one."
        actions={[
          { label: "Edit Floor", icon: <CustomEditIcon fontSize="small" />, onClick: (f) => handleOpenEdit(f) },
        ]}
      />

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Floor</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel id="prop-select-label">Select Property</InputLabel>
            <Select labelId="prop-select-label" value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)} label="Select Property">
              {properties.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Floor Number" type="number" fullWidth value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddFloor} variant="contained" color="primary">
            Save Floor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Floor Number</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField label="Floor Number" type="number" fullWidth value={editFloorNumber} onChange={(e) => setEditFloorNumber(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditFloor} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
