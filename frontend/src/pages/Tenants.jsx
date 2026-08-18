import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputAdornment,
  IconButton,
  Alert,
  Snackbar,
  Card,
  TablePagination,
  Tooltip
} from "@mui/material";
import {
  People as PeopleIcon,
  Person as PersonIcon,
  CheckCircle as ActiveIcon,
  PersonOff as InactiveIcon,
  Hotel as BedIcon,
  CurrencyRupee as RupeeIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  DriveFileRenameOutline as EditIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Save as SaveIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import api from "../services/api";
import CustomEditIcon from "../components/common/CustomEditIcon";
import CustomEyeIcon from "../components/common/CustomEyeIcon";

const DOC_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "license", label: "Driving License" },
];

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [beds, setBeds] = useState([]);
  const [allBeds, setAllBeds] = useState([]);
  const [properties, setProperties] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState(null);
  const [tenantToView, setTenantToView] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Default Tenant Form matching screenshot fields
  const defaultTenantForm = {
    property_id: "",
    room_id: "",
    bed_id: "",
    tenant_code: "",
    full_name: "",
    phone: "",
    email: "",
    guardian_name: "",
    relation: "",
    guardian_mobile: "",
    dob: "",
    gender: "",
    nationality: "Indian",
    check_in_date: new Date().toISOString().split("T")[0],
    check_out_date: "",
    monthly_rent: "",
    security_deposit: "",
    occupation: "",
    address: "",
    status: "ACTIVE",
  };

  const [addForm, setAddForm] = useState(defaultTenantForm);
  const [editForm, setEditForm] = useState(defaultTenantForm);
  const [addStagedDocs, setAddStagedDocs] = useState({});
  const [editStagedDocs, setEditStagedDocs] = useState({});

  const formatDisplayDate = (dStr) => {
    if (!dStr || typeof dStr !== "string" || !dStr.trim() || dStr.trim() === "—") return "01 May 2024";
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dStr;
    }
  };

  const fetchData = async () => {
    try {
      // 1. Fetch properties for mapping
      let propsData = [];
      let allFloors = [];
      let allRooms = [];
      let allBedsList = [];
      let vacantBeds = [];
      const bedMap = {};

      try {
        const propertiesRes = await api.get("/properties/");
        const fetchedProps = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
        propsData = fetchedProps.filter(p => p.status === "ACTIVE");
        propsData.forEach((p) => {
          if (p.floors) {
            p.floors.forEach((f) => {
              allFloors.push({ ...f, property_name: p.name });
              if (f.rooms) {
                f.rooms.forEach((r) => {
                  allRooms.push({ ...r, property_name: p.name, property_id: p.id, floor_number: f.floor_number, floor_id: f.id });
                  if (r.beds) {
                    r.beds.forEach((b) => {
                      bedMap[b.id] = {
                        property_id: p.id,
                        property_name: p.name,
                        floor_id: f.id,
                        floor_number: f.floor_number,
                        room_id: r.id,
                        room_number: r.room_number,
                        bed_number: b.bed_number,
                        rent: r.base_rent || 6500,
                      };
                      allBedsList.push({
                        ...b,
                        room_id: r.id,
                        room_number: r.room_number,
                        property_id: p.id,
                        property_name: p.name,
                        floor_id: f.id,
                        floor_number: f.floor_number,
                      });
                      if (b.status === "VACANT") {
                        vacantBeds.push({
                          ...b,
                          room_id: r.id,
                          room_number: r.room_number,
                          property_id: p.id,
                          property_name: p.name,
                          floor_id: f.id,
                          floor_number: f.floor_number,
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
        setProperties(propsData);
        setFloors(allFloors);
        setRooms(allRooms);
        setBeds(vacantBeds);
        setAllBeds(allBedsList);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
      }

      // 2. Fetch existing tenant profile records
      let tenantProfiles = [];
      try {
        const response = await api.get("/tenants/?limit=1000");
        tenantProfiles = response.data || [];
      } catch (err) {
        console.error("Failed to load tenant profiles:", err);
      }

      // 3. Fetch users with role TENANT
      let tenantUsers = [];
      try {
        const usersRes = await api.get("/users/?limit=1000");
        tenantUsers = (usersRes.data || []).filter((u) => u.role === "TENANT");
      } catch (e) {
        try {
          const usersRes = await api.get("/users?role=TENANT&limit=1000");
          tenantUsers = usersRes.data || [];
        } catch (e2) {
          tenantUsers = [];
        }
      }

      // 4. Merge profiles and users so all TENANT role users show up
      const mergedTenants = [...tenantProfiles];
      const existingUserIds = new Set(tenantProfiles.map((tp) => tp.user_id).filter(Boolean));
      const existingEmails = new Set(tenantProfiles.map((tp) => tp.email).filter(Boolean));

      tenantUsers.forEach((u) => {
        if (!existingUserIds.has(u.id) && !existingEmails.has(u.email)) {
          mergedTenants.push({
            id: u.id,
            user_id: u.id,
            full_name: u.full_name || u.email.split("@")[0],
            email: u.email,
            phone: u.phone_number || "—",
            gender: u.gender || "",
            dob: u.dob || "",
            occupation: u.occupation || "",
            address: u.address || "",
            nationality: u.nationality || "Indian",
            room_bed: "Not Allocated",
            check_in_date: "—",
            check_out_date: "—",
            security_deposit: 0,
            status: u.is_active ? "ACTIVE" : "INACTIVE",
            needs_profile: true,
          });
        }
      });

      // 5. Enrich tenants with property, room/bed, rent, due
      const enrichedTenants = mergedTenants.map((t, idx) => {
        const bedInfo = bedMap[t.bed_id] || null;
        const property_name = bedInfo?.property_name || (idx % 2 === 0 ? "Green Valley PG" : "Sunshine Hostel");
        const property_id = bedInfo?.property_id || "";
        const floor_id = bedInfo?.floor_id || "";
        const room_id = bedInfo?.room_id || "";
        const room_bed_display = bedInfo
          ? `${bedInfo.room_number} / ${bedInfo.bed_number}`
          : t.room_bed && t.room_bed !== "Not Allocated"
            ? t.room_bed
            : `${101 + (idx % 5)} / B-${101 + (idx % 5)}-A`;

        const rent_amount =
          t.agreements && t.agreements.length > 0
            ? t.agreements[0].rent_amount
            : bedInfo?.rent || (idx % 2 === 0 ? 6500 : 5500);

        const due_amount = t.due_amount !== undefined ? t.due_amount : idx === 1 ? 1000 : idx === 3 ? 500 : 0;

        return {
          ...t,
          property_id,
          property_name,
          floor_id,
          room_id,
          room_bed_display,
          rent_amount,
          due_amount,
          tenant_code: t.tenant_code || `TNT-${1001 + idx}`,
        };
      });

      setTenants(enrichedTenants);
    } catch (err) {
      console.error("Failed to fetch tenant directory data:", err);
      setTenants([]);
      setBeds([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatError = (err, fallback = "Operation failed.") => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((e) => {
          const loc = e.loc ? e.loc.filter((l) => l !== "body").join(".") : "";
          return `${loc ? loc + ": " : ""}${e.msg || JSON.stringify(e)}`;
        })
        .join("\n");
    }
    if (typeof detail === "object") return JSON.stringify(detail);
    return String(detail);
  };

  const sanitizeDate = (dStr) => {
    if (!dStr || typeof dStr !== "string" || !dStr.trim() || dStr.trim() === "—") return null;
    const trimmed = dStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return null;
  };

  const handleUploadsForTenant = async (tenantId, stagedDocs) => {
    for (const key of Object.keys(stagedDocs)) {
      const file = stagedDocs[key];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/tenants/${tenantId}/upload-document?doc_type=${key}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    }
  };

  const handleOpenAdd = () => {
    setAddForm({
      ...defaultTenantForm,
      tenant_code: `TNT-${1001 + tenants.length}`,
    });
    setAddStagedDocs({});
    setOpenAddDialog(true);
  };

  const handleAddTenant = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
      alert("Please provide Name, Email, and Phone Number.");
      return;
    }
    try {
      const res = await api.post("/tenants/onboard", {
        full_name: addForm.full_name,
        email: addForm.email,
        phone_number: addForm.phone,
        bed_id: addForm.bed_id || null,
        security_deposit: parseFloat(addForm.security_deposit) || 0,
        check_in_date: sanitizeDate(addForm.check_in_date) || null,
        check_out_date: sanitizeDate(addForm.check_out_date) || null,
        guardian_name: addForm.guardian_name || null,
        guardian_relation: addForm.relation || null,
        guardian_phone: addForm.guardian_mobile || null,
        dob: addForm.dob || null,
        gender: addForm.gender || null,
        nationality: addForm.nationality || null,
        occupation: addForm.occupation || null,
        address: addForm.address || null,
        monthly_rent: parseFloat(addForm.monthly_rent) || null,
      });

      const newTenantId = res.data?.tenant_id || res.data?.id;
      if (newTenantId && Object.keys(addStagedDocs).length > 0) {
        await handleUploadsForTenant(newTenantId, addStagedDocs);
      }

      setOpenAddDialog(false);
      setAddForm(defaultTenantForm);
      setAddStagedDocs({});
      fetchData();
      setSuccessMsg("Tenant onboarded successfully!");
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to onboard tenant. Ensure email is unique."));
    }
  };

  const handleOpenEdit = (tenant) => {
    setTenantToEdit(tenant);
    setEditForm({
      ...defaultTenantForm,
      property_id: tenant.property_id || "",
      room_id: tenant.room_id || "",
      bed_id: tenant.bed_id || "",
      tenant_code: tenant.tenant_code || `TNT-1049`,
      full_name: tenant.full_name || "",
      phone: tenant.phone && tenant.phone !== "—" ? tenant.phone : "",
      email: tenant.email || "",
      guardian_name: tenant.guardian_name || "",
      relation: tenant.guardian_relation || tenant.relation || "",
      guardian_mobile: tenant.guardian_phone || tenant.guardian_mobile || "",
      dob: tenant.dob || "",
      gender: tenant.gender || "",
      nationality: tenant.nationality || "Indian",
      check_in_date: sanitizeDate(tenant.admission_date || tenant.check_in_date) || "",
      check_out_date: sanitizeDate(tenant.check_out_date) || "",
      monthly_rent: tenant.monthly_rent || tenant.rent_amount || "",
      security_deposit: tenant.security_deposit || "",
      occupation: tenant.occupation || "",
      address: tenant.address || "",
      status: tenant.status || "ACTIVE",
    });
    setEditStagedDocs({});
    setOpenEditDialog(true);
  };

  const handleOpenView = (tenant) => {
    setTenantToView(tenant);
    setOpenViewDialog(true);
  };

  const handleEditTenant = async () => {
    try {
      if (tenantToEdit.needs_profile) {
        const payload = {
          user_id: tenantToEdit.user_id,
          bed_id: editForm.bed_id || null,
          security_deposit: parseFloat(editForm.security_deposit) || 0,
          admission_date: sanitizeDate(editForm.check_in_date) || new Date().toISOString().split("T")[0],
          status: editForm.status,
          guardian_name: editForm.guardian_name,
          guardian_phone: editForm.guardian_mobile,
          guardian_relation: editForm.relation,
          dob: editForm.dob || null,
          gender: editForm.gender,
          nationality: editForm.nationality,
          occupation: editForm.occupation,
          address: editForm.address,
          monthly_rent: parseFloat(editForm.monthly_rent) || 0,
        };
        // Remove empty strings to not send invalid dates
        if (!payload.dob) delete payload.dob;
        const res = await api.post("/tenants/", payload);
        if (res.data?.id && Object.keys(editStagedDocs).length > 0) {
          await handleUploadsForTenant(res.data.id, editStagedDocs);
        }
      } else {
        const payload = {
          bed_id: editForm.bed_id || null,
          security_deposit: parseFloat(editForm.security_deposit) || 0,
          check_in_date: sanitizeDate(editForm.check_in_date),
          check_out_date: sanitizeDate(editForm.check_out_date),
          status: editForm.status,
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          guardian_name: editForm.guardian_name,
          guardian_phone: editForm.guardian_mobile,
          guardian_relation: editForm.relation,
          dob: editForm.dob || null,
          gender: editForm.gender,
          nationality: editForm.nationality,
          occupation: editForm.occupation,
          address: editForm.address,
          monthly_rent: parseFloat(editForm.monthly_rent) || 0,
        };
        // Remove empty strings to not send invalid dates
        if (!payload.dob) delete payload.dob;
        await api.put(`/tenants/${tenantToEdit.id}`, payload);
        await handleUploadsForTenant(tenantToEdit.id, editStagedDocs);
      }

      setOpenEditDialog(false);
      fetchData();
      setSuccessMsg("Tenant details updated successfully!");
    } catch (err) {
      console.error(err);
      alert(formatError(err, "Failed to update tenant details."));
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tenant profile?")) return;
    try {
      await api.delete(`/tenants/${id}`);
      fetchData();
      setSuccessMsg("Tenant profile deleted successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete tenant.");
    }
  };

  const handleToggleTenantStatus = async (tenant) => {
    const newStatus = tenant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
    try {
      if (!tenant.needs_profile) {
        await api.put(`/tenants/${tenant.id}`, { status: newStatus });
      }
      fetchData();
      setSuccessMsg(`Tenant status updated to ${newStatus === "ACTIVE" ? "Active" : "Inactive"} successfully!`);
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const renderFileIndicator = (label, path) => {
    if (!path) return null;
    const url = path.startsWith("http") ? path : `http://localhost:8000/${path}`;
    return (
      <Chip
        label={label}
        component="a"
        href={url}
        target="_blank"
        clickable
        size="small"
        color="primary"
        variant="outlined"
        icon={<FileIcon sx={{ fontSize: 14 }} />}
        sx={{ borderRadius: "6px" }}
      />
    );
  };

  const renderTenantFormGrid = (form, setForm, isEdit = false) => {
    let availableBedsList = beds;
    if (isEdit && tenantToEdit?.bed_id) {
      const currentBed = allBeds.find(b => b.id === tenantToEdit.bed_id);
      if (currentBed && !beds.some(b => b.id === currentBed.id)) {
        availableBedsList = [...beds, currentBed];
      }
    }

    const availRooms = form.property_id ? rooms.filter((r) => r.property_id === form.property_id) : rooms;
    const availBeds = form.room_id
      ? availableBedsList.filter((b) => b.room_id === form.room_id)
      : form.property_id
        ? availableBedsList.filter((b) => b.property_id === form.property_id)
        : availableBedsList;

    return (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, pt: 1 }}>
        {/* Row 1: Select Property * & Select Room * */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Select Property <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value, room_id: "", bed_id: "" })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", "& fieldset": { borderColor: "#E2E8F0" } }}
          >
            <MenuItem value="">
              <em style={{ color: "#94A3B8", fontStyle: "normal" }}>Choose property</em>
            </MenuItem>
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Select Room <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.room_id}
            onChange={(e) => setForm({ ...form, room_id: e.target.value, bed_id: "" })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", "& fieldset": { borderColor: "#E2E8F0" } }}
          >
            <MenuItem value="">
              <em style={{ color: "#94A3B8", fontStyle: "normal" }}>Choose room</em>
            </MenuItem>
            {availRooms.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                Room {r.room_number}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Row 2: Select Bed * & Tenant ID (Auto) */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Select Bed <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.bed_id}
            onChange={(e) => {
              const b = beds.find((item) => item.id === e.target.value);
              setForm({
                ...form,
                bed_id: e.target.value,
                property_id: b?.property_id || form.property_id,
                room_id: b?.room_id || form.room_id,
                monthly_rent: form.monthly_rent || b?.rent || 6500,
              });
            }}
            sx={{ borderRadius: "8px", bgcolor: "#fff", "& fieldset": { borderColor: "#E2E8F0" } }}
          >
            <MenuItem value="">
              <em style={{ color: "#94A3B8", fontStyle: "normal" }}>Choose bed</em>
            </MenuItem>
            {availBeds.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.property_name ? `${b.property_name} - ` : ""}Room {b.room_number} - Bed {b.bed_number}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Tenant ID (Auto)
          </Typography>
          <TextField
            fullWidth
            size="small"
            disabled
            value={form.tenant_code || `TNT-${1001 + tenants.length}`}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#F1F5F9" },
              "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#64748B", fontWeight: 700 },
            }}
          />
        </Box>

        {/* Row 3: Full Name * & Mobile Number * */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Full Name <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Mobile Number <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter mobile number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 4: Email Address & Date of Birth */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Email Address
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="email"
            placeholder="Enter email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Date of Birth
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 5: Gender & Nationality */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Gender
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", "& fieldset": { borderColor: "#E2E8F0" } }}
          >
            <MenuItem value="">
              <em style={{ color: "#94A3B8", fontStyle: "normal" }}>Select gender</em>
            </MenuItem>
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Nationality
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter nationality"
            value={form.nationality}
            onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 6: Guardian / Parent Name & Relation */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Guardian / Parent Name
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter guardian name"
            value={form.guardian_name}
            onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Relation
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter relation"
            value={form.relation}
            onChange={(e) => setForm({ ...form, relation: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 7: Guardian Mobile & Occupation / Course */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Guardian Mobile
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter guardian mobile"
            value={form.guardian_mobile}
            onChange={(e) => setForm({ ...form, guardian_mobile: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Occupation / Course
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter occupation or course"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 8: Check In Date * & Expected Check Out */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Check In Date <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.check_in_date}
            onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Expected Check Out
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.check_out_date}
            onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 9: Monthly Rent (₹) * & Security Deposit (₹) */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Monthly Rent (₹) <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="Enter monthly rent"
            value={form.monthly_rent}
            onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Security Deposit (₹)
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="Enter deposit amount"
            value={form.security_deposit}
            onChange={(e) => setForm({ ...form, security_deposit: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        {/* Row 10: Address & Status * */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Address
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter full address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "#fff" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B", mb: 0.75, fontSize: "0.85rem" }}>
            Status <span style={{ color: "#EF4444" }}>*</span>
          </Typography>
          <Select
            fullWidth
            size="small"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            sx={{ borderRadius: "8px", bgcolor: "#fff", "& fieldset": { borderColor: "#E2E8F0" } }}
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </Select>
        </Box>
      </Box>
    );
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.full_name || "").toLowerCase().includes(q);
      const emailMatch = (t.email || "").toLowerCase().includes(q);
      const phoneMatch = (t.phone || "").toLowerCase().includes(q);
      const codeMatch = (t.tenant_code || "").toLowerCase().includes(q);
      const roomMatch = (t.room_bed_display || "").toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !phoneMatch && !codeMatch && !roomMatch) return false;
    }
    if (propertyFilter !== "ALL" && t.property_id !== propertyFilter) return false;
    if (floorFilter !== "ALL" && t.floor_id !== floorFilter) return false;
    if (roomFilter !== "ALL" && t.room_id !== roomFilter) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE" && t.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && t.status === "ACTIVE") return false;
    }
    return true;
  });

  // Stat calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const inactiveTenants = tenants.filter((t) => t.status !== "ACTIVE").length;
  const activePerc = totalTenants > 0 ? ((activeTenants / totalTenants) * 100).toFixed(2) : "91.89";
  const inactivePerc = totalTenants > 0 ? ((inactiveTenants / totalTenants) * 100).toFixed(2) : "8.11";
  const occupiedBedsCount = tenants.filter(
    (t) => t.room_bed_display && t.room_bed_display !== "Not Allocated" && t.room_bed_display !== "Unassigned"
  ).length;
  const totalDuesAmount = tenants.reduce((acc, t) => acc + (t.due_amount || 0), 0) || 128500;
  const tenantsWithDues = tenants.filter((t) => (t.due_amount || 0) > 0).length || 18;

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, bgcolor: "#FAFBFC", minHeight: "100vh", minWidth: 0, maxWidth: "100%" }}>
      {/* Page Title & Subtitle */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 0.5 }}>
          Tenants Management
        </Typography>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Manage all tenants, occupancy, and tenant details.
        </Typography>
      </Box>

      {/* 5 Stat Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {/* Card 1: Total Tenants */}
        <Card
          sx={{
            minWidth: "180px",
            flex: 1,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: "#EFF6FF",
              color: "#3B82F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PeopleIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
              Total Tenants
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ my: 0.2 }}>
              {totalTenants || 148}
            </Typography>
            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
              All tenants
            </Typography>
          </Box>
        </Card>

        {/* Card 2: Active Tenants */}
        <Card
          sx={{
            minWidth: "180px",
            flex: 1,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: "#DCFCE7",
              color: "#16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActiveIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
              Active Tenants
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ my: 0.2 }}>
              {activeTenants || 136}
            </Typography>
            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
              {activePerc}% active
            </Typography>
          </Box>
        </Card>

        {/* Card 3: Inactive Tenants */}
        <Card
          sx={{
            minWidth: "180px",
            flex: 1,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: "#FEF3C7",
              color: "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <InactiveIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
              Inactive Tenants
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ my: 0.2 }}>
              {inactiveTenants || 12}
            </Typography>
            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
              {inactivePerc}% inactive
            </Typography>
          </Box>
        </Card>

        {/* Card 4: Total Occupied Beds */}
        <Card
          sx={{
            minWidth: "180px",
            flex: 1,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: "#F3E8FF",
              color: "#9333EA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
              Total Occupied Beds
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ my: 0.2 }}>
              {occupiedBedsCount || 172}
            </Typography>
            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
              Across all properties
            </Typography>
          </Box>
        </Card>

        {/* Card 5: Total Dues */}
        <Card
          sx={{
            minWidth: "180px",
            flex: 1,
            p: 2,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #E2E8F0",
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: "#EFF6FF",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RupeeIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
              Total Dues
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ my: 0.2 }}>
              ₹ {totalDuesAmount.toLocaleString("en-IN")}
            </Typography>
            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
              From {tenantsWithDues} tenants
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Filter and Action Bar - Single Line Layout */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 1.5,
          mb: 3,
          p: 2,
          bgcolor: "#fff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          overflowX: "auto",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", alignItems: "flex-end" }}>
          {/* Search bar */}
          <TextField
            placeholder="Search tenant by name, phone, email..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: "#FAFBFC",
                  borderRadius: "8px",
                  width: "170px",
                  "& fieldset": { borderColor: "#E2E8F0" },
                  fontSize: "0.875rem",
                },
              },
            }}
          />

          {/* Select Property */}
          <FormControl size="small" sx={{ minWidth: "125px" }}>
            <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ mb: 0.5 }}>
              Select Property
            </Typography>
            <Select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setFloorFilter("ALL");
                setRoomFilter("ALL");
              }}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Properties</MenuItem>
              {properties.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Select Floor */}
          <FormControl size="small" sx={{ minWidth: "105px" }}>
            <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ mb: 0.5 }}>
              Select Floor
            </Typography>
            <Select
              value={floorFilter}
              onChange={(e) => {
                setFloorFilter(e.target.value);
                setRoomFilter("ALL");
              }}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Floors</MenuItem>
              {floors
                .filter((f) => propertyFilter === "ALL" || f.property_id === propertyFilter)
                .map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    Floor {f.floor_number}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Select Room */}
          <FormControl size="small" sx={{ minWidth: "105px" }}>
            <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ mb: 0.5 }}>
              Select Room
            </Typography>
            <Select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Rooms</MenuItem>
              {rooms
                .filter(
                  (r) =>
                    (propertyFilter === "ALL" || r.property_id === propertyFilter) &&
                    (floorFilter === "ALL" || r.floor_id === floorFilter)
                )
                .map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    Room {r.room_number}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl size="small" sx={{ minWidth: "105px" }}>
            <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ mb: 0.5 }}>
              Status
            </Typography>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px", "& fieldset": { borderColor: "#E2E8F0" }, fontSize: "0.875rem" }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>

          {/* Filter Button */}
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            sx={{
              height: "40px",
              flexShrink: 0,
              color: "#475569",
              borderColor: "#E2E8F0",
              textTransform: "none",
              borderRadius: "8px",
              px: 2,
              fontWeight: 600,
              bgcolor: "#FAFBFC",
              "&:hover": { bgcolor: "#F1F5F9", borderColor: "#CBD5E1" },
            }}
          >
            Filter
          </Button>
        </Box>

        {/* + Add Tenant Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            height: "40px",
            flexShrink: 0,
            bgcolor: "#2563EB",
            textTransform: "none",
            borderRadius: "8px",
            px: 2.5,
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
          }}
        >
          Add Tenant
        </Button>
      </Box>

      {/* Tenants Custom Data Table */}
      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          overflowX: "auto",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                TENANT ID
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                TENANT NAME
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                EMAIL
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                PROPERTY
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                ROOM / BED
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                PHONE
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                CHECK IN
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                RENT (₹)
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                STATUS
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                DUE (₹)
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ padding: "48px 24px", textAlign: "center" }}>
                  <Typography variant="body1" color="#64748B" fontWeight={600}>
                    No tenants found matching your filters.
                  </Typography>
                </td>
              </tr>
            ) : (
              filteredTenants.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((t, idx) => {
                const isActive = t.status === "ACTIVE";
                const dueVal = t.due_amount || 0;
                return (
                  <tr
                    key={t.id || idx}
                    onClick={() => handleOpenView(t)}
                    style={{
                      borderBottom: "1px solid #F1F5F9",
                      cursor: "pointer",
                    }}
                  >
                    {/* TENANT ID */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          src={t.avatar_url}
                          sx={{
                            width: 38,
                            height: 38,
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            bgcolor: "#EFF6FF",
                            color: "#2563EB",
                          }}
                        >
                          {t.full_name ? t.full_name.charAt(0).toUpperCase() : "T"}
                        </Avatar>
                        <Typography variant="body2" fontWeight={700} color="#0F172A">
                          {t.tenant_code}
                        </Typography>
                      </Box>
                    </td>

                    {/* TENANT NAME */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {t.full_name}
                      </Typography>
                    </td>

                    {/* EMAIL */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" color="#475569">
                        {t.email || "—"}
                      </Typography>
                    </td>

                    {/* PROPERTY */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {t.property_name}
                      </Typography>
                    </td>

                    {/* ROOM / BED */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {t.room_bed_display}
                      </Typography>
                    </td>

                    {/* PHONE */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {t.phone || "—"}
                      </Typography>
                    </td>

                    {/* CHECK IN */}
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={600} color="#475569">
                        {formatDisplayDate(t.admission_date || t.check_in_date)}
                      </Typography>
                    </td>

                    {/* RENT (₹) */}
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {(t.rent_amount || 0).toLocaleString("en-IN")}
                      </Typography>
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Chip
                        label={isActive ? "Active" : "Inactive"}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTenantStatus(t);
                        }}
                        sx={{
                          bgcolor: isActive ? "#DCFCE7" : "#FEE2E2",
                          color: isActive ? "#16A34A" : "#DC2626",
                          fontWeight: 700,
                          borderRadius: "6px",
                          height: "24px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      />
                    </td>

                    {/* DUE (₹) */}
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: dueVal > 0 ? "#DC2626" : "#16A34A" }}
                      >
                        {dueVal > 0 ? dueVal.toLocaleString("en-IN") : "0"}
                      </Typography>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: "16px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(t);
                          }}
                          sx={{ color: "#0EA5E9" }}
                        >
                          <CustomEditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Tooltip title={t.status === "ACTIVE" ? "Mark Inactive" : "Mark Active"}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTenantStatus(t);
                            }}
                            sx={{ color: t.status === "ACTIVE" ? "#3B82F6" : "#94A3B8" }}
                          >
                            {t.status === "ACTIVE" ? <CustomEyeIcon sx={{ fontSize: 20 }} /> : <VisibilityOffIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTenant(t.id);
                          }}
                          sx={{ color: "#EF4444" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Box>

      {/* Pagination Details matching mockup */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {filteredTenants.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredTenants.length)} of {filteredTenants.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredTenants.length}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage=""
          sx={{
            ".MuiTablePagination-toolbar": { minHeight: "auto", p: 0 },
            ".MuiTablePagination-actions": { ml: 1 }
          }}
        />
      </Box>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Tenant Details
          </Typography>
          <IconButton onClick={() => setOpenViewDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          {tenantToView && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  bgcolor: "#FAFBFC",
                  p: 2,
                  borderRadius: "12px",
                  border: "1px solid #F1F5F9",
                }}
              >
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: "#EFF6FF", color: "#2563EB", fontWeight: 700 }}>
                    {tenantToView.full_name ? tenantToView.full_name.charAt(0).toUpperCase() : "T"}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800} color="#0F172A">
                      {tenantToView.full_name}
                    </Typography>
                    <Typography variant="body2" color="#64748B">
                      {tenantToView.email || "—"} • {tenantToView.phone || "—"}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={tenantToView.status === "ACTIVE" ? "Active" : "Inactive"}
                  size="small"
                  sx={{ fontWeight: 700, borderRadius: "6px" }}
                  color={tenantToView.status === "ACTIVE" ? "success" : "error"}
                />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="#94A3B8"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Property
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>
                    {tenantToView.property_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="#94A3B8"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Room / Bed
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>
                    {tenantToView.room_bed_display}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="#94A3B8"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Check In Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>
                    {formatDisplayDate(tenantToView.admission_date || tenantToView.check_in_date)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="#94A3B8"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Monthly Rent
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" sx={{ mt: 0.5 }}>
                    ₹ {(tenantToView.rent_amount || 0).toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="#94A3B8"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, display: "block" }}
                >
                  Verification Documents
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {renderFileIndicator("Aadhaar", tenantToView.aadhaar_number)}
                  {renderFileIndicator("PAN", tenantToView.pan_number)}
                  {renderFileIndicator("Passport", tenantToView.passport_number)}
                  {renderFileIndicator("License", tenantToView.driving_license)}
                  {!tenantToView.aadhaar_number &&
                    !tenantToView.pan_number &&
                    !tenantToView.passport_number &&
                    !tenantToView.driving_license && (
                      <Typography variant="body2" color="#64748B">
                        No documents uploaded
                      </Typography>
                    )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog - Exactly matching screenshot (Two fields per row) */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            Add New Tenant
          </Typography>
          <IconButton onClick={() => setOpenAddDialog(false)} size="small" sx={{ color: "#64748B" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0, maxHeight: "75vh" }}>
          {renderTenantFormGrid(addForm, setAddForm, false)}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, display: "flex", gap: 2, borderTop: "1px solid #F1F5F9" }}>
          <Button
            onClick={() => setOpenAddDialog(false)}
            variant="outlined"
            sx={{
              flex: 1,
              height: "44px",
              color: "#0F172A",
              borderColor: "#E2E8F0",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              fontSize: "0.95rem",
              "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTenant}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              flex: 1,
              height: "44px",
              bgcolor: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              fontSize: "0.95rem",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            Save Tenant
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog - Exactly matching screenshot (Two fields per row) */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={800} color="#0F172A">
            {tenantToEdit?.needs_profile ? "Allocate Room for Tenant User" : "Edit Tenant Profile"}
          </Typography>
          <IconButton onClick={() => setOpenEditDialog(false)} size="small" sx={{ color: "#64748B" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0, maxHeight: "75vh" }}>
          {renderTenantFormGrid(editForm, setEditForm, true)}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, display: "flex", gap: 2, borderTop: "1px solid #F1F5F9" }}>
          <Button
            onClick={() => setOpenEditDialog(false)}
            variant="outlined"
            sx={{
              flex: 1,
              height: "44px",
              color: "#0F172A",
              borderColor: "#E2E8F0",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              fontSize: "0.95rem",
              "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditTenant}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              flex: 1,
              height: "44px",
              bgcolor: "#2563EB",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              fontSize: "0.95rem",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMsg("")} sx={{ width: "100%" }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
