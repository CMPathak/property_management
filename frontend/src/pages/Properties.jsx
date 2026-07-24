import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
      borderRadius: 12,
    },
  },
};

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [managers, setManagers] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState(null);
  const [propertyToView, setPropertyToView] = useState(null);

  // Add Form State
  const [newPropName, setNewPropName] = useState("");
  const [newPropAddress, setNewPropAddress] = useState("");
  const [newPropDesc, setNewPropDesc] = useState("");
  const [newPropFloors, setNewPropFloors] = useState("1");
  const [newPropManagers, setNewPropManagers] = useState([]);

  // File upload state for Add
  const [newPropImageFiles, setNewPropImageFiles] = useState([]);
  const [newPropDocFiles, setNewPropDocFiles] = useState([]);

  // Edit Form State
  const [editPropName, setEditPropName] = useState("");
  const [editPropAddress, setEditPropAddress] = useState("");
  const [editPropDesc, setEditPropDesc] = useState("");
  const [editPropFloors, setEditPropFloors] = useState("1");
  const [editPropManagers, setEditPropManagers] = useState([]);

  // File upload state for Edit
  const [editPropImageFiles, setEditPropImageFiles] = useState([]);
  const [editPropDocFiles, setEditPropDocFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);

  const fetchData = async () => {
    try {
      const response = await api.get("/properties/");
      setProperties(response.data);
    } catch (err) {
      console.error("Failed to load properties details:", err);
      setProperties([]);
    }

    try {
      const usersRes = await api.get("/users/");
      const availableManagers = usersRes.data.filter((u) =>
        ["MANAGER", "STAFF", "OWNER", "SUPER_ADMIN"].includes(u.role)
      );
      setManagers(availableManagers);
    } catch (err) {
      console.error("Failed to load managers list:", err);
      setManagers([]);
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

  const handleAddProperty = async () => {
    try {
      const payload = {
        name: newPropName,
        address: newPropAddress,
        description: newPropDesc,
        images: [],
        documents: [],
        manager_ids: newPropManagers,
      };

      const response = await api.post("/properties/", payload);
      const createdPropertyId = response.data.id;

      const totalFloorsCount = parseInt(newPropFloors) || 0;
      for (let i = 1; i <= totalFloorsCount; i++) {
        try {
          await api.post("/floors/", {
            floor_number: i,
            property_id: createdPropertyId,
          });
        } catch (e) {
          console.error(`Failed to auto-create floor ${i}:`, e);
        }
      }

      for (const file of newPropImageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/properties/${createdPropertyId}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      for (const file of newPropDocFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/properties/${createdPropertyId}/upload-document`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setOpenAddDialog(false);
      setNewPropName("");
      setNewPropAddress("");
      setNewPropDesc("");
      setNewPropFloors("1");
      setNewPropManagers([]);
      setNewPropImageFiles([]);
      setNewPropDocFiles([]);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(formatError(err));
    }
  };

  const handleOpenEdit = (p) => {
    setPropertyToEdit(p);
    setEditPropName(p.name);
    setEditPropAddress(p.address);
    setEditPropDesc(p.description || "");
    setEditPropFloors(p.floors ? p.floors.length.toString() : "0");
    setEditPropManagers(p.managers?.map((m) => m.id) || []);
    setExistingImages(p.images || []);
    setExistingDocs(p.documents || []);
    setEditPropImageFiles([]);
    setEditPropDocFiles([]);
    setOpenEditDialog(true);
  };

  const handleEditProperty = async () => {
    try {
      const payload = {
        name: editPropName,
        address: editPropAddress,
        description: editPropDesc,
        images: existingImages,
        documents: existingDocs,
        manager_ids: editPropManagers,
      };

      await api.put(`/properties/${propertyToEdit.id}`, payload);

      const targetFloorsCount = parseInt(editPropFloors) || 0;
      const currentFloors = propertyToEdit.floors || [];
      if (targetFloorsCount > currentFloors.length) {
        for (let i = currentFloors.length + 1; i <= targetFloorsCount; i++) {
          try {
            await api.post("/floors/", {
              floor_number: i,
              property_id: propertyToEdit.id,
            });
          } catch (e) {
            console.error(`Failed to add floor ${i}:`, e);
          }
        }
      } else if (targetFloorsCount < currentFloors.length) {
        const floorsToDelete = currentFloors.filter((f) => f.floor_number > targetFloorsCount);
        for (const f of floorsToDelete) {
          try {
            await api.delete(`/floors/${f.id}`);
          } catch (e) {
            console.error(`Failed to delete floor ${f.floor_number}:`, e);
          }
        }
      }

      for (const file of editPropImageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/properties/${propertyToEdit.id}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      for (const file of editPropDocFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/properties/${propertyToEdit.id}/upload-document`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setOpenEditDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update property and files.");
    }
  };

  const handleDeleteProperty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      await api.delete(`/properties/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete property.");
    }
  };

  const getManagerNames = (ids) => {
    return ids.map((id) => {
      const m = managers.find((x) => x.id === id);
      return m ? m.full_name || m.email : id;
    });
  };

  const handleOpenView = (p) => {
    setPropertyToView(p);
    setOpenViewDialog(true);
  };

  const handleTogglePropertyStatus = async (p) => {
    const nextActive = p.is_active === false ? true : false;
    setProperties((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: nextActive } : item)));
    try {
      await api.put(`/properties/${p.id}`, { is_active: nextActive });
      fetchData();
    } catch (err) {
      console.error(err);
      setProperties((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: p.is_active } : item)));
      alert(err.response?.data?.detail || "Failed to update property status.");
    }
  };

  const handleAddImageStaged = (e, targetSet) => {
    const files = Array.from(e.target.files);
    targetSet((prev) => [...prev, ...files]);
  };

  const handleAddDocStaged = (e, targetSet) => {
    const files = Array.from(e.target.files);
    targetSet((prev) => [...prev, ...files]);
  };

  const handleRemoveStagedFile = (idx, targetSet) => {
    targetSet((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingFile = (idx, list, setList) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const columns = [
    {
      id: "name",
      label: "Property Name",
      render: (p) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color="primary.main"
          onClick={() => handleOpenView(p)}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          {p.name}
        </Typography>
      ),
    },
    { id: "address", label: "Address" },
    {
      id: "description",
      label: "Description",
      render: (p) => p.description || "—",
    },
    {
      id: "floors",
      label: "Floors",
      render: (p) => p.floors?.length || 0,
    },
    {
      id: "managers",
      label: "Managers",
      render: (p) => (
        <Typography variant="body2" color="text.primary" fontWeight={600}>
          {p.managers?.map((m) => m.full_name || m.email || "Manager").join(", ") || "—"}
        </Typography>
      ),
    },
    {
      id: "images",
      label: "Images",
      render: (p) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {p.images?.map((img, idx) => {
            const url = img.startsWith("http") ? img : `http://localhost:8000/${img}`;
            return <Avatar key={idx} src={url} variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px" }} />;
          })}
          {(!p.images || p.images.length === 0) && "—"}
        </Box>
      ),
    },
    {
      id: "is_active",
      label: "Status",
      render: (p) => {
        const isActive = p.is_active !== false;
        return (
          <Chip
            label={isActive ? "ACTIVE" : "INACTIVE"}
            size="small"
            onClick={() => handleTogglePropertyStatus(p)}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              bgcolor: isActive ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: isActive ? "#16A34A" : "#DC2626",
              "&:hover": {
                bgcolor: isActive ? "rgba(34, 197, 94, 0.22)" : "rgba(239, 68, 68, 0.22)",
              },
            }}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Properties Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your real estate portfolio, floors, assigned managers, and documents.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Add Property
        </Button>
      </Box>

      {/* Modern DataGrid Table */}
      <DataTable
        columns={columns}
        data={properties}
        searchPlaceholder="Search by property name, address, or manager..."
        emptyMessage="No properties registered yet. Click 'Add Property' to start."
        actions={[
          { label: "Edit Property", icon: <CustomEditIcon fontSize="small" />, onClick: (p) => handleOpenEdit(p) },
          { label: "Toggle Status (Active/Inactive)", icon: <CustomEyeIcon fontSize="small" />, onClick: (p) => handleTogglePropertyStatus(p) },
          { label: "Delete", icon: <DeleteIcon fontSize="small" color="error" />, onClick: (p) => handleDeleteProperty(p.id) },
        ]}
      />

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Property Overview</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {propertyToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight={800} color="primary">
                {propertyToView.name}
              </Typography>
              <Typography variant="body2">
                <b>Address:</b> {propertyToView.address}
              </Typography>
              <Typography variant="body2">
                <b>Description:</b> {propertyToView.description || "—"}
              </Typography>
              <Typography variant="body2">
                <b>Total Floors:</b> {propertyToView.floors?.length || 0}
              </Typography>
              <Typography variant="body2">
                <b>Status:</b> {propertyToView.is_active !== false ? "ACTIVE" : "INACTIVE"}
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
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Property</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Property Name"
            fullWidth
            variant="outlined"
            value={newPropName}
            onChange={(e) => setNewPropName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Address"
            fullWidth
            variant="outlined"
            value={newPropAddress}
            onChange={(e) => setNewPropAddress(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={newPropDesc}
            onChange={(e) => setNewPropDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Total Floors"
            type="number"
            fullWidth
            variant="outlined"
            value={newPropFloors}
            onChange={(e) => setNewPropFloors(e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="add-managers-label">Assign Managers / Staff</InputLabel>
            <Select
              labelId="add-managers-label"
              id="add-managers-select"
              multiple
              value={newPropManagers}
              onChange={(e) => setNewPropManagers(e.target.value)}
              input={<OutlinedInput label="Assign Managers / Staff" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {getManagerNames(selected).map((name) => (
                    <Chip key={name} label={name} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.full_name || m.email} ({m.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2, p: 2, border: "1px dashed #CBD5E1", borderRadius: "12px", bgcolor: "#F8FAFC" }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              Property Images
            </Typography>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="add-images-file-input"
              type="file"
              multiple
              onChange={(e) => handleAddImageStaged(e, setNewPropImageFiles)}
            />
            <label htmlFor="add-images-file-input">
              <Button variant="outlined" component="span" startIcon={<UploadIcon />} size="small">
                Choose Images
              </Button>
            </label>
            <List dense>
              {newPropImageFiles.map((file, idx) => (
                <ListItem
                  key={idx}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRemoveStagedFile(idx, setNewPropImageFiles)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddProperty} variant="contained" color="primary">
            Save Property
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Property</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Property Name"
            fullWidth
            variant="outlined"
            value={editPropName}
            onChange={(e) => setEditPropName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Address"
            fullWidth
            variant="outlined"
            value={editPropAddress}
            onChange={(e) => setEditPropAddress(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={editPropDesc}
            onChange={(e) => setEditPropDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Total Floors"
            type="number"
            fullWidth
            variant="outlined"
            value={editPropFloors}
            onChange={(e) => setEditPropFloors(e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-managers-label">Assign Managers / Staff</InputLabel>
            <Select
              labelId="edit-managers-label"
              id="edit-managers-select"
              multiple
              value={editPropManagers}
              onChange={(e) => setEditPropManagers(e.target.value)}
              input={<OutlinedInput label="Assign Managers / Staff" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {getManagerNames(selected).map((name) => (
                    <Chip key={name} label={name} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.full_name || m.email} ({m.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditProperty} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
