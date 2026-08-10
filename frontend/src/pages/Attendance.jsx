import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
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
  Card,
  IconButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment
} from "@mui/material";
import {
  Search as SearchIcon,
  GetApp as ExportIcon,
  PictureAsPdf as PdfIcon,
  Add as AddIcon,
  Event as CalendarIcon,
  PeopleAlt as PeopleIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  Assessment as MonthlyIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import api from "../services/api";
import CustomEyeIcon from "../components/common/CustomEyeIcon";
import CustomEditIcon from "../components/common/CustomEditIcon";

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  STAFF: "Staff",
  TENANT: "Tenant"
};

// Helpers
const parseTime = (timeStr) => {
  if (!timeStr || timeStr === "—" || timeStr === "-") return null;
  
  // Try 12-hour format first (e.g. 09:00 AM)
  const match12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12) {
    let [_, h, m, ampm] = match12;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  // Try 24-hour format (e.g. 09:00 or 18:00)
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return null;
};

const calcWorkAndOvertime = (checkIn, checkOut) => {
  const inMins = parseTime(checkIn);
  const outMins = parseTime(checkOut);
  if (inMins === null || outMins === null) {
    return { work: "00h 00m", over: "00h 00m" };
  }
  let totalMins = outMins - inMins;
  if (totalMins < 0) totalMins += 24 * 60; // next day
  const standardMins = 9 * 60; // 9 hours
  
  let overMins = 0;
  if (totalMins > standardMins) {
    overMins = totalMins - standardMins;
  }
  
  const formatMins = (m) => {
    const hh = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    return `${hh}h ${mm}m`;
  };
  
  return { work: formatMins(totalMins), over: formatMins(overMins) };
};

const getStatusColor = (status, checkIn) => {
  let s = (status || "").toUpperCase();
  // Simple logic to detect late if status is present but checkin is late
  if (s === "PRESENT" && checkIn) {
    const inTime = parseTime(checkIn);
    if (inTime && inTime > parseTime("09:15 AM")) s = "LATE";
  }

  if (s === "PRESENT") return { bg: "#DCFCE7", text: "#166534", label: "Present" };
  if (s === "ABSENT") return { bg: "#FEE2E2", text: "#991B1B", label: "Absent" };
  if (s === "LATE") return { bg: "#FFEDD5", text: "#C2410C", label: "Late" };
  if (s === "HALF DAY" || s === "HALF_DAY") return { bg: "#DBEAFE", text: "#1E40AF", label: "Half Day" };
  if (s === "LEAVE") return { bg: "#F3E8FF", text: "#6B21A8", label: "Leave" };
  return { bg: "#F1F5F9", text: "#475569", label: s || "Unknown" };
};

const getFormattedDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return { top: day, bottom: weekday };
};

// StatCard Component for specific design
const MetricCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => (
  <Card sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
    <Box sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon sx={{ color: iconColor, fontSize: 24 }} />
    </Box>
    <Box sx={{ minWidth: 0, overflow: "hidden" }}>
      <Typography sx={{ color: "#64748B", fontWeight: 600, fontSize: "0.75rem", mb: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</Typography>
      <Typography sx={{ color: "#0F172A", fontWeight: 800, fontSize: "1.25rem", mb: 0.5, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.65rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</Typography>
    </Box>
  </Card>
);

export default function Attendance() {
  const user = useSelector((state) => state.auth.user);
  const isFullAccess = user?.role === "SUPER_ADMIN" || user?.role === "OWNER" || (user?.role === "STAFF" && user?.designation === "Property Manager");

  const [staffUsers, setStaffUsers] = useState([]);
  const [records, setRecords] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [desigFilter, setDesigFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("2024-05"); // Defaulting to match image visually, but will be dynamic
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Dialogs
  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [customStaffName, setCustomStaffName] = useState("");
  const [statusVal, setStatusVal] = useState("PRESENT");
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("18:00");

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return "";
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;
    let [_, h, m, ampm] = match;
    h = parseInt(h, 10);
    if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m}`;
  };

  const format12Hour = (time24) => {
    if (!time24 || time24 === "—") return "";
    if (time24.toUpperCase().includes("AM") || time24.toUpperCase().includes("PM")) {
      return time24.replace(/(AM|PM)\s*(AM|PM)/ig, "$1").trim();
    }
    const [hStr, mStr] = time24.split(":");
    if (!hStr || !mStr) return time24;
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, "0")}:${mStr} ${ampm}`;
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get("/users/");
      const staffOnly = (res.data || []).filter((u) => u.role !== "TENANT");
      setStaffUsers(staffOnly);
    } catch (e) {
      console.error("Failed to load staff list:", e);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/attendance/");
      setRecords(res.data || []);
    } catch (e) {
      console.error("Failed to load attendance records:", e);
    }
  };

  useEffect(() => {
    fetchStaffUsers();
    fetchAttendance();
    // Initialize month filter to current month
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    setMonthFilter(`${now.getFullYear()}-${mm}`);
  }, []);

  const getMergedRecords = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayMonth = todayStr.substring(0, 7);
    const shouldAddVirtual = monthFilter === "ALL" || monthFilter === todayMonth;
    
    let merged = [...records];
    
    if (shouldAddVirtual) {
      const targetUsers = staffUsers.length > 0 
        ? staffUsers 
        : (user && user.role !== "TENANT" ? [user] : []);
        
      targetUsers.forEach((staff) => {
        const hasTodayRecord = records.some((r) => {
          const matchesName = r.staff_name?.toLowerCase() === staff.full_name?.toLowerCase() ||
                              r.staff_name?.toLowerCase() === staff.email?.split("@")[0].toLowerCase();
          const matchesDate = r.date === todayStr;
          return matchesName && matchesDate;
        });
        
        if (!hasTodayRecord) {
          merged.push({
            id: `virtual_${staff.id}`,
            staff_name: staff.full_name || staff.email.split("@")[0],
            role: staff.role,
            employee_id: staff.employee_id || "—",
            designation: staff.designation || "—",
            department: staff.department || "—",
            shift_timing: staff.shift_timing || "—",
            date: todayStr,
            check_in: "—",
            check_out: "—",
            status: "ABSENT"
          });
        }
      });
    }
    
    return merged;
  };

  const mergedRecords = getMergedRecords();
  const userRecords = isFullAccess
    ? mergedRecords
    : mergedRecords.filter((r) => {
        const userName = user?.full_name?.toLowerCase() || "";
        const userEmailName = user?.email?.split("@")[0].toLowerCase() || "";
        const recordName = r.staff_name?.toLowerCase() || "";
        return recordName === userName || recordName === userEmailName;
      });

  // Apply Filters
  const filteredRecords = userRecords.filter((r) => {
    if (monthFilter !== "ALL" && r.date && !r.date.startsWith(monthFilter)) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.staff_name || "").toLowerCase().includes(q);
      const matchId = (r.employee_id || "").toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    
    if (deptFilter !== "ALL" && r.department !== deptFilter) return false;
    if (desigFilter !== "ALL" && r.designation !== desigFilter) return false;
    if (shiftFilter !== "ALL" && r.shift_timing !== shiftFilter) return false;
    
    if (statusFilter !== "ALL") {
      const sColor = getStatusColor(r.status, r.check_in);
      if (sColor.label.toUpperCase() !== statusFilter.toUpperCase()) return false;
    }
    
    return true;
  });

  const paginatedRecords = filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Metrics Logic
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecords = mergedRecords.filter(r => r.date === todayStr);
  const totalStaffCount = staffUsers.length;
  
  const presentToday = todayRecords.filter(r => {
    const s = getStatusColor(r.status, r.check_in).label.toUpperCase();
    return s === "PRESENT" || s === "LATE" || s === "HALF DAY";
  }).length;
  
  const absentToday = todayRecords.filter(r => {
    const s = getStatusColor(r.status, r.check_in).label.toUpperCase();
    return s === "ABSENT" || s === "LEAVE";
  }).length;
  
  const lateToday = todayRecords.filter(r => {
    const s = getStatusColor(r.status, r.check_in).label.toUpperCase();
    return s === "LATE";
  }).length;
  
  const presentPct = totalStaffCount ? ((presentToday / totalStaffCount) * 100).toFixed(2) : "0.00";
  const absentPct = totalStaffCount ? ((absentToday / totalStaffCount) * 100).toFixed(2) : "0.00";
  const latePct = presentToday ? ((lateToday / presentToday) * 100).toFixed(2) : "0.00";
  
  // Dummy monthly attendance % for now, in real scenario calculate days present / total working days
  const monthlyAttPct = presentPct;

  // Unique options for filters
  const departments = ["All Departments", ...Array.from(new Set(staffUsers.map(s => s.department).filter(Boolean)))];
  const designations = ["All Designations", ...Array.from(new Set(staffUsers.map(s => s.designation).filter(Boolean)))];
  const shifts = ["All Shifts", ...Array.from(new Set(staffUsers.map(s => s.shift_timing).filter(Boolean)))];

  const handleMarkAttendanceSubmit = async () => {
    let nameToUse = customStaffName;
    let roleToUse = "STAFF";
    let staffIdToUse = selectedStaffId;

    if (!isFullAccess && user) {
      nameToUse = user.full_name || user.email.split("@")[0];
      roleToUse = user.role;
      staffIdToUse = user.id;
    } else if (selectedStaffId) {
      const matched = staffUsers.find((u) => u.id === selectedStaffId);
      if (matched) {
        nameToUse = matched.full_name || matched.email.split("@")[0];
        roleToUse = matched.role;
      }
    }

    if (!nameToUse) {
      alert("Please select or enter a staff member name.");
      return;
    }

    try {
      await api.post("/attendance/", {
        staff_id: staffIdToUse || undefined,
        staff_name: nameToUse,
        role: roleToUse,
        date: new Date().toISOString().split("T")[0],
        check_in: format12Hour(checkInTime),
        check_out: format12Hour(checkOutTime),
        status: statusVal,
      });
      setOpenCheckIn(false);
      fetchAttendance();
    } catch (err) {
      alert("Failed to mark attendance.");
    }
  };

  const handleOpenEdit = (r) => {
    if (r.id.toString().startsWith("virtual_")) {
      setSelectedStaffId(r.id.replace("virtual_", ""));
      setCustomStaffName(r.staff_name);
      setStatusVal("PRESENT");
      setCheckInTime("09:00");
      setCheckOutTime("18:00");
      setOpenCheckIn(true);
      return;
    }
    setRecordToEdit(r);
    setCustomStaffName(r.staff_name);
    setStatusVal(r.status || "PRESENT");
    setCheckInTime(convertTo24Hour(r.check_in || "09:00 AM"));
    setCheckOutTime(convertTo24Hour(r.check_out || "06:00 PM"));
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!recordToEdit) return;
    try {
      await api.put(`/attendance/${recordToEdit.id}`, {
        check_in: format12Hour(checkInTime),
        check_out: format12Hour(checkOutTime),
        status: statusVal,
      });
      setOpenEditDialog(false);
      fetchAttendance();
    } catch (err) {
      alert("Failed to update attendance.");
    }
  };

  const handleDeleteRecord = async (r) => {
    if (r.id.toString().startsWith("virtual_")) return;
    if (!window.confirm(`Delete attendance record for ${r.staff_name}?`)) return;
    try {
      await api.delete(`/attendance/${r.id}`);
      fetchAttendance();
    } catch (err) {
      alert("Failed to delete record.");
    }
  };

  const renderFormFields = (isEdit = false) => (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
      <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
        {isEdit ? (
          <TextField label="Staff Name *" fullWidth value={customStaffName} disabled />
        ) : (
          isFullAccess ? (
            staffUsers.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel id="select-staff-label">Select Staff *</InputLabel>
                <Select labelId="select-staff-label" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} label="Select Staff *">
                  {staffUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name || u.email.split("@")[0]} ({roleLabels[u.role] || u.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Staff Name *" fullWidth value={customStaffName} onChange={(e) => setCustomStaffName(e.target.value)} />
            )
          ) : (
            <TextField label="Staff Name *" fullWidth value={user?.full_name || user?.email?.split("@")[0] || ""} disabled />
          )
        )}
      </Box>

      <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
        <TextField label="Attendance Date *" type="date" fullWidth defaultValue={new Date().toISOString().split("T")[0]} InputLabelProps={{ shrink: true }} />
      </Box>

      <Box sx={{ gridColumn: "span 2" }}>
        <FormControl fullWidth>
          <InputLabel>Shift *</InputLabel>
          <Select defaultValue="General" label="Shift *">
            <MenuItem value="General">General Shift (09:00 AM - 06:00 PM)</MenuItem>
            <MenuItem value="Morning">Morning Shift (06:00 AM - 02:00 PM)</MenuItem>
            <MenuItem value="Night">Night Shift (08:00 PM - 05:00 AM)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
        <TextField label="Check-In Time *" type="time" fullWidth value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}>
        <TextField label="Check-Out Time *" type="time" fullWidth value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>

      <Box sx={{ gridColumn: "span 2" }}>
        <FormControl fullWidth>
          <InputLabel id="att-status">Attendance Status *</InputLabel>
          <Select labelId="att-status" value={statusVal} onChange={(e) => setStatusVal(e.target.value)} label="Attendance Status *">
            <MenuItem value="PRESENT">PRESENT</MenuItem>
            <MenuItem value="ABSENT">ABSENT</MenuItem>
            <MenuItem value="LEAVE">ON LEAVE</MenuItem>
            <MenuItem value="HALF_DAY">HALF DAY</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ gridColumn: "span 2" }}>
        <TextField
          label="Overtime Hours (Auto Calculated)"
          fullWidth
          value={calcWorkAndOvertime(checkInTime, checkOutTime).over}
          InputProps={{ readOnly: true }}
          helperText={`Working Hours: ${calcWorkAndOvertime(checkInTime, checkOutTime).work} | Automatically counted after 9 standard working hours.`}
          sx={{ bgcolor: "#F8FAFC", "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
        />
      </Box>

      <Box sx={{ gridColumn: "span 2" }}>
        <TextField label="Remarks" fullWidth multiline rows={3} placeholder="Enter any remarks..." />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, pb: 4 }} className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ mb: 1 }}>
          Staff Attendance & Monthly Report
        </Typography>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Track employee attendance, working hours, overtime, and monthly performance.
        </Typography>
      </Box>

      {/* Metric Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }, gap: 3, mb: 4 }}>
        <MetricCard
          title="Total Staff"
          value={totalStaffCount}
          subtitle="All Staff Members"
          icon={PeopleIcon}
          iconBg="#E0E7FF"
          iconColor="#4F46E5"
        />
        <MetricCard
          title="Present Today"
          value={presentToday}
          subtitle={`${presentPct}% Present`}
          icon={PresentIcon}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
        />
        <MetricCard
          title="Absent Today"
          value={absentToday}
          subtitle={`${absentPct}% Absent`}
          icon={AbsentIcon}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
        <MetricCard
          title="Late Check-ins"
          value={lateToday}
          subtitle={`${latePct}% Late`}
          icon={LateIcon}
          iconBg="#FFEDD5"
          iconColor="#EA580C"
        />
        <MetricCard
          title="Monthly Attendance"
          value={`${monthlyAttPct}%`}
          subtitle="This Month"
          icon={MonthlyIcon}
          iconBg="#F3E8FF"
          iconColor="#9333EA"
        />
      </Box>

      {/* Filter Row */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by name or employee ID..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: "250px", bgcolor: "#fff", borderRadius: "8px", "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94A3B8" }} />
              </InputAdornment>
            ),
          }}
        />
        <Select
          size="small"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          displayEmpty
          sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px", color: deptFilter === "ALL" ? "#0F172A" : "#0F172A" }}
        >
          {departments.map((d, i) => <MenuItem key={i} value={i === 0 ? "ALL" : d}>{d}</MenuItem>)}
        </Select>
        <Select
          size="small"
          value={desigFilter}
          onChange={(e) => setDesigFilter(e.target.value)}
          displayEmpty
          sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px" }}
        >
          {designations.map((d, i) => <MenuItem key={i} value={i === 0 ? "ALL" : d}>{d}</MenuItem>)}
        </Select>
        <Select
          size="small"
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          displayEmpty
          sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px" }}
        >
          {shifts.map((d, i) => <MenuItem key={i} value={i === 0 ? "ALL" : d}>{d}</MenuItem>)}
        </Select>
        <Select
          size="small"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          displayEmpty
          sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px" }}
        >
          <MenuItem value="ALL">All Months</MenuItem>
          <MenuItem value="2026-07">July 2026</MenuItem>
          <MenuItem value="2026-06">June 2026</MenuItem>
          <MenuItem value="2026-05">May 2026</MenuItem>
          <MenuItem value="2024-05">May 2024</MenuItem>
        </Select>
      </Box>

      {/* Action Row */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="#64748B" fontWeight={600}>Attendance Status</Typography>
          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
            sx={{ width: "160px", bgcolor: "#fff", borderRadius: "8px" }}
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="PRESENT">Present</MenuItem>
            <MenuItem value="ABSENT">Absent</MenuItem>
            <MenuItem value="LATE">Late</MenuItem>
            <MenuItem value="HALF DAY">Half Day</MenuItem>
            <MenuItem value="LEAVE">Leave</MenuItem>
          </Select>
        </Box>
        
        <Box sx={{ display: "flex", gap: 2, ml: { xs: 0, md: "auto" }, mt: { xs: 2, md: 0 }, alignItems: "flex-end" }}>
          <Button variant="outlined" startIcon={<ExportIcon />} sx={{ color: "#16A34A", borderColor: "#E2E8F0", bgcolor: "#fff", height: "40px", borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>
            Export Excel
          </Button>
          <Button variant="outlined" startIcon={<PdfIcon />} sx={{ color: "#DC2626", borderColor: "#E2E8F0", bgcolor: "#fff", height: "40px", borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCheckIn(true)} sx={{ bgcolor: "#2563EB", color: "#fff", height: "40px", borderRadius: "8px", textTransform: "none", fontWeight: 700, boxShadow: "none", "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" } }}>
            Mark Attendance
          </Button>
        </Box>
      </Box>

      {/* Table Area */}
      <TableContainer component={Paper} sx={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #F1F5F9" }}>
        <Table sx={{ minWidth: 1000, "& .MuiTableCell-root": { whiteSpace: "nowrap" } }}>
          <TableHead sx={{ bgcolor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>EMPLOYEE ID</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>STAFF NAME</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>DESIGNATION</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>DEPARTMENT</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>SHIFT</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>DATE</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>CHECK-IN</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>CHECK-OUT</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>WORKING HOURS</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>OVERTIME</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase" }}>STATUS</TableCell>
              <TableCell sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid #F1F5F9", textTransform: "uppercase", textAlign: "right" }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((r, idx) => {
                const times = calcWorkAndOvertime(r.check_in, r.check_out);
                const sColor = getStatusColor(r.status, r.check_in);
                const dt = getFormattedDate(r.date);
                
                return (
                  <TableRow key={idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", borderBottom: "1px solid #F8FAFC" }}>
                      {r.employee_id || "STF-000"}
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar src={r.avatar || ""} sx={{ width: 32, height: 32, bgcolor: "#E2E8F0", color: "#64748B", fontWeight: 700, fontSize: "0.85rem" }}>
                          {r.staff_name ? r.staff_name.charAt(0).toUpperCase() : "?"}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                          {r.staff_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", borderBottom: "1px solid #F8FAFC" }}>
                      {r.designation || "—"}
                    </TableCell>
                    <TableCell sx={{ color: "#475569", fontWeight: 600, fontSize: "0.85rem", borderBottom: "1px solid #F8FAFC" }}>
                      {r.department || "—"}
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                        {r.shift_timing?.split("(")[0] || "General Shift"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500 }}>
                        {r.shift_timing?.includes("(") ? `(${r.shift_timing.split("(")[1]}` : "(9AM - 6PM)"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                        {dt.top}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500 }}>
                        {dt.bottom}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: r.check_in && r.check_in !== "—" ? "#16A34A" : "#94A3B8", fontWeight: 700, fontSize: "0.85rem", borderBottom: "1px solid #F8FAFC" }}>
                      {r.check_in || "—"}
                    </TableCell>
                    <TableCell sx={{ color: r.check_out && r.check_out !== "—" ? "#DC2626" : "#94A3B8", fontWeight: 700, fontSize: "0.85rem", borderBottom: "1px solid #F8FAFC" }}>
                      {r.check_out || "—"}
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Box sx={{ display: "inline-flex", px: 1, py: 0.5, borderRadius: "6px", bgcolor: "#E0E7FF", color: "#4F46E5", fontWeight: 700, fontSize: "0.75rem" }}>
                        {times.work}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Box sx={{ display: "inline-flex", px: 1, py: 0.5, borderRadius: "6px", bgcolor: "#FFEDD5", color: "#EA580C", fontWeight: 700, fontSize: "0.75rem" }}>
                        {times.over}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid #F8FAFC" }}>
                      <Box sx={{ display: "inline-flex", px: 1.5, py: 0.5, borderRadius: "6px", bgcolor: sColor.bg, color: sColor.text, fontWeight: 700, fontSize: "0.75rem" }}>
                        {sColor.label}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", borderBottom: "1px solid #F8FAFC" }}>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                        <IconButton size="small" sx={{ border: "1px solid #E2E8F0", borderRadius: "8px", p: 0.5, color: "#2563EB" }}>
                          <CustomEyeIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton onClick={() => handleOpenEdit(r)} size="small" sx={{ border: "1px solid #E2E8F0", borderRadius: "8px", p: 0.5, color: "#2563EB" }}>
                          <CustomEditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteRecord(r)} size="small" sx={{ border: "1px solid #E2E8F0", borderRadius: "8px", p: 0.5, color: "#EF4444" }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={12} sx={{ py: 6, textAlign: "center", color: "#64748B" }}>
                  <Typography variant="body1" fontWeight={600}>No attendance records found.</Typography>
                  <Typography variant="body2">Try adjusting your filters or date range.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination Details matching mockup */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="#64748B" fontWeight={500}>
          Showing {filteredRecords.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
        </Typography>
        <TablePagination
          component="div"
          count={filteredRecords.length}
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

      {/* Record Attendance Dialog */}
      <Dialog open={openCheckIn} onClose={() => setOpenCheckIn(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #F1F5F9", p: 3 }}>Mark Staff Attendance</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {renderFormFields(false)}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid #F1F5F9" }}>
          <Button onClick={() => setOpenCheckIn(false)} sx={{ color: "#64748B", fontWeight: 700, border: "1px solid #E2E8F0", px: 3, py: 1, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleMarkAttendanceSubmit} variant="contained" color="primary" sx={{ bgcolor: "#2563EB", fontWeight: 700, px: 3, py: 1, borderRadius: "8px", boxShadow: "none" }}>
            Save Attendance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #F1F5F9", p: 3 }}>Edit Staff Attendance</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {renderFormFields(true)}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid #F1F5F9" }}>
          <Button onClick={() => setOpenEditDialog(false)} sx={{ color: "#64748B", fontWeight: 700, border: "1px solid #E2E8F0", px: 3, py: 1, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary" sx={{ bgcolor: "#2563EB", fontWeight: 700, px: 3, py: 1, borderRadius: "8px", boxShadow: "none" }}>
            Update Attendance
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
