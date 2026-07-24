import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Button,
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
  Card,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  EventAvailable as CheckInIcon,
  Schedule as ClockIcon,
  GetApp as ExportIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  DateRange as CalendarIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";
import StatCard from "../components/common/StatCard";

export default function Attendance() {
  const user = useSelector((state) => state.auth.user);
  const isFullAccess = user?.role === "SUPER_ADMIN" || user?.role === "OWNER" || user?.role === "MANAGER";

  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("ALL");

  const [records, setRecords] = useState([]);

  const [openCheckIn, setOpenCheckIn] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [customStaffName, setCustomStaffName] = useState("");
  const [statusVal, setStatusVal] = useState("PRESENT");
  const [checkInTime, setCheckInTime] = useState("09:00 AM");
  const [checkOutTime, setCheckOutTime] = useState("06:00 PM");

  const getMergedRecords = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayMonth = todayStr.substring(0, 7);
    const shouldAddVirtual = selectedMonth === "ALL" || selectedMonth === todayMonth;
    
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

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get("/users/");
      const staffOnly = (res.data || []).filter((u) => u.role !== "TENANT");
      setStaffUsers(staffOnly);
    } catch (e) {
      console.error("Failed to load staff list for attendance:", e);
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
  }, []);

  // Filter records by selected month and selected employee
  const filteredRecords = userRecords.filter((r) => {
    const matchesMonth = !selectedMonth || selectedMonth === "ALL" || (r.date && r.date.startsWith(selectedMonth));
    const matchesEmployee =
      selectedEmployeeFilter === "ALL" ||
      (r.staff_name && r.staff_name.toLowerCase() === selectedEmployeeFilter.toLowerCase());
    return matchesMonth && matchesEmployee;
  });

  // Unique list of employee names for filter dropdown
  const uniqueEmployeeNames = Array.from(new Set(userRecords.map((r) => r.staff_name)));

  // Calculate Month-wise & Employee-wise Report Metrics
  const presentCount = filteredRecords.filter((r) => r.status === "PRESENT").length;
  const absentCount = filteredRecords.filter((r) => r.status === "ABSENT").length;
  const leaveCount = filteredRecords.filter((r) => r.status === "LEAVE" || r.status === "HALF_DAY").length;

  const getStaffDetail = (staffName, field) => {
    const matched = staffUsers.find(
      (u) =>
        (u.full_name && u.full_name.toLowerCase() === staffName.toLowerCase()) ||
        (u.email && u.email.split("@")[0].toLowerCase() === staffName.toLowerCase())
    );
    return matched ? matched[field] : null;
  };

  const handleOpenCheckIn = () => {
    if (!isFullAccess && user) {
      setCustomStaffName(user.full_name || user.email.split("@")[0]);
      setSelectedStaffId("");
    } else {
      setCustomStaffName("");
      setSelectedStaffId("");
    }
    setCheckInTime("09:00 AM");
    setCheckOutTime("06:00 PM");
    setStatusVal("PRESENT");
    setOpenCheckIn(true);
  };

  const handleMarkAttendance = async () => {
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

    const payload = {
      staff_name: nameToUse,
      staff_id: staffIdToUse || null,
      date: new Date().toISOString().split("T")[0],
      check_in: checkInTime || "Pending",
      check_out: checkOutTime || "Pending",
      status: statusVal,
    };

    try {
      const res = await api.post("/attendance/", payload);
      setRecords([res.data, ...records]);
      setOpenCheckIn(false);
      setSelectedStaffId("");
      setCustomStaffName("");
    } catch (e) {
      console.error("Failed to save attendance:", e);
      alert("Failed to save attendance record.");
    }
  };

  const handleOpenEdit = (r) => {
    setRecordToEdit(r);
    setCustomStaffName(r.staff_name);
    setStatusVal(r.status);
    setCheckInTime(r.check_in === "—" ? "09:00 AM" : r.check_in);
    setCheckOutTime(r.check_out === "—" ? "06:00 PM" : r.check_out);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    const payload = {
      check_in: checkInTime,
      check_out: checkOutTime,
      status: statusVal,
      date: recordToEdit.date,
      staff_id: recordToEdit.id.startsWith("virtual_") ? recordToEdit.id.replace("virtual_", "") : null
    };

    try {
      if (recordToEdit.id.startsWith("virtual_")) {
        const res = await api.post("/attendance/", payload);
        setRecords([res.data, ...records]);
      } else {
        const res = await api.put(`/attendance/${recordToEdit.id}`, payload);
        setRecords((prev) =>
          prev.map((r) => (r.id === recordToEdit.id ? res.data : r))
        );
      }
      setOpenEditDialog(false);
    } catch (e) {
      console.error("Failed to update attendance:", e);
      alert("Failed to update attendance record.");
    }
  };

  // Export Combined or Individual CSV Report
  const handleExportCSV = (recordsToExport = filteredRecords, filenamePrefix = "Attendance_Report") => {
    const header = "Staff Name,Employee ID,Role,Designation,Department,Shift Timing,Date,Check-In Time,Check-Out Time,Attendance Status";
    const csvRows = recordsToExport.map((r) => {
      const empId = getStaffDetail(r.staff_name, "employee_id") || r.employee_id || "—";
      const desig = getStaffDetail(r.staff_name, "designation") || r.designation || "—";
      const dept = getStaffDetail(r.staff_name, "department") || r.department || "—";
      const shift = getStaffDetail(r.staff_name, "shift_timing") || r.shift_timing || "—";
      return `"${r.staff_name}","${empId}","${r.role}","${desig}","${dept}","${shift}","${r.date}","${r.check_in}","${r.check_out}","${r.status}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [header, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    const empLabel = selectedEmployeeFilter !== "ALL" ? `_${selectedEmployeeFilter.replace(/\s+/g, "_")}` : "_All_Staff";
    link.setAttribute("download", `${filenamePrefix}_${selectedMonth || "Monthly"}${empLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Individual Employee Attendance Statement
  const handleExportIndividual = (record) => {
    const empRecords = userRecords.filter((r) => r.staff_name.toLowerCase() === record.staff_name.toLowerCase());
    handleExportCSV(empRecords, `Individual_Attendance_${record.staff_name.replace(/\s+/g, "_")}`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const columns = [
    {
      id: "staff_name",
      label: "Staff / Employee Name",
      render: (r) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ClockIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700}>
            {r.staff_name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "employee_id",
      label: "Emp ID",
      render: (r) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {r.employee_id || "—"}
        </Typography>
      ),
    },
    {
      id: "role",
      label: "Role",
      render: (r) => <Chip label={r.role} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "designation",
      label: "Designation",
      render: (r) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {r.designation || "—"}
        </Typography>
      ),
    },
    {
      id: "department",
      label: "Department",
      render: (r) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {r.department || "—"}
        </Typography>
      ),
    },
    {
      id: "shift_timing",
      label: "Shift Timing",
      render: (r) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {r.shift_timing || "—"}
        </Typography>
      ),
    },
    {
      id: "date",
      label: "Date",
      render: (r) => r.date,
    },
    {
      id: "check_in",
      label: "Check-In Time",
      render: (r) => r.check_in,
    },
    {
      id: "check_out",
      label: "Check-Out Time",
      render: (r) => r.check_out,
    },
    {
      id: "status",
      label: "Status",
      render: (r) => (
        <Chip
          label={r.status}
          size="small"
          color={r.status === "PRESENT" ? "success" : r.status === "LEAVE" ? "warning" : "error"}
          sx={{ borderRadius: "6px", fontWeight: 700 }}
        />
      ),
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Staff Attendance & Month-Wise Report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isFullAccess
              ? "Full Access: Filter combined reports for all employees or generate individual staff attendance statements."
              : "Daily check-in / check-out logs and shift tracking."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={handlePrintPDF}>
            Print / PDF Statement
          </Button>
          <Button variant="outlined" color="success" startIcon={<ExportIcon />} onClick={() => handleExportCSV()}>
            {selectedEmployeeFilter === "ALL" 
              ? (isFullAccess ? "Export All Staff CSV" : "Export My CSV") 
              : `Export ${selectedEmployeeFilter} CSV`}
          </Button>
          <Button variant="contained" color="primary" startIcon={<CheckInIcon />} onClick={handleOpenCheckIn}>
            Record Attendance
          </Button>
        </Box>
      </Box>

      {/* Month & Employee Filter Controls */}
      <Card sx={{ p: 2.5, borderRadius: "16px", mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: isFullAccess ? { xs: "1fr", md: "1fr 1fr" } : "1fr", gap: 2, alignItems: "center" }}>
          {/* Month Selector */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CalendarIcon color="primary" />
            <FormControl fullWidth size="small">
              <InputLabel id="month-filter-label">Select Month</InputLabel>
              <Select
                labelId="month-filter-label"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Select Month"
              >
                <MenuItem value="2026-07">July 2026 (Current Month)</MenuItem>
                <MenuItem value="2026-06">June 2026</MenuItem>
                <MenuItem value="2026-05">May 2026</MenuItem>
                <MenuItem value="2026-04">April 2026</MenuItem>
                <MenuItem value="ALL">All Months (Entire History)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Individual vs All Staff Selector */}
          {isFullAccess && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PersonIcon color="primary" />
              <FormControl fullWidth size="small">
                <InputLabel id="employee-filter-label">Select Employee Report View</InputLabel>
                <Select
                  labelId="employee-filter-label"
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                  label="Select Employee Report View"
                >
                  <MenuItem value="ALL">All Employees (Combined Attendance)</MenuItem>
                  {uniqueEmployeeNames.map((name) => (
                    <MenuItem key={name} value={name}>
                      Individual: {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      </Card>

      {/* Monthly Attendance KPI Summary */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
        <StatCard
          title="Present Days"
          value={presentCount}
          subtitle={selectedEmployeeFilter === "ALL" ? `Month ${selectedMonth}` : `Staff: ${selectedEmployeeFilter}`}
          icon={PresentIcon}
          trend="Present"
          trendType="up"
          iconBg="rgba(34, 197, 94, 0.1)"
          iconColor="#22C55E"
        />
        <StatCard
          title="Absent Days"
          value={absentCount}
          subtitle={selectedEmployeeFilter === "ALL" ? `Month ${selectedMonth}` : `Staff: ${selectedEmployeeFilter}`}
          icon={AbsentIcon}
          trend="Absent"
          trendType="down"
          iconBg="rgba(239, 68, 68, 0.1)"
          iconColor="#EF4444"
        />
        <StatCard
          title="Leaves / Half Days"
          value={leaveCount}
          subtitle={selectedEmployeeFilter === "ALL" ? `Month ${selectedMonth}` : `Staff: ${selectedEmployeeFilter}`}
          icon={ClockIcon}
          trend="Approved"
          trendType="up"
          iconBg="rgba(245, 158, 11, 0.1)"
          iconColor="#F59E0B"
        />
      </Box>

      {/* Attendance Data Table */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        searchPlaceholder="Search staff name, date, or status..."
        emptyMessage={`No attendance records found for month ${selectedMonth} (${selectedEmployeeFilter}).`}
        actions={
          isFullAccess
            ? [
                { label: "Download Staff Report", icon: <ExportIcon fontSize="small" />, onClick: (r) => handleExportIndividual(r) },
                { label: "Edit Record", icon: <CustomEditIcon fontSize="small" />, onClick: (r) => handleOpenEdit(r) },
              ]
            : []
        }
      />

      {/* Record Attendance Dialog */}
      <Dialog open={openCheckIn} onClose={() => setOpenCheckIn(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Punch Staff Attendance</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {isFullAccess ? (
            staffUsers.length > 0 ? (
              <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
                <InputLabel id="select-staff-label">Select Staff Member</InputLabel>
                <Select labelId="select-staff-label" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} label="Select Staff Member">
                  {staffUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.full_name || u.email.split("@")[0]} ({u.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField label="Staff Name" fullWidth value={customStaffName} onChange={(e) => setCustomStaffName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
            )
          ) : (
            <TextField label="Staff Name" fullWidth value={user?.full_name || user?.email?.split("@")[0] || ""} disabled sx={{ mt: 1, mb: 2 }} />
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="att-status">Attendance Status</InputLabel>
            <Select labelId="att-status" value={statusVal} onChange={(e) => setStatusVal(e.target.value)} label="Attendance Status">
              <MenuItem value="PRESENT">PRESENT</MenuItem>
              <MenuItem value="ABSENT">ABSENT</MenuItem>
              <MenuItem value="LEAVE">ON LEAVE</MenuItem>
              <MenuItem value="HALF_DAY">HALF DAY</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Check-In Time" fullWidth value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            <TextField label="Check-Out Time" fullWidth value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenCheckIn(false)}>Cancel</Button>
          <Button onClick={handleMarkAttendance} variant="contained" color="primary">
            Save Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Attendance Record</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField label="Staff Name" fullWidth value={customStaffName} disabled sx={{ mt: 1, mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="edit-att-status">Attendance Status</InputLabel>
            <Select labelId="edit-att-status" value={statusVal} onChange={(e) => setStatusVal(e.target.value)} label="Attendance Status">
              <MenuItem value="PRESENT">PRESENT</MenuItem>
              <MenuItem value="ABSENT">ABSENT</MenuItem>
              <MenuItem value="LEAVE">ON LEAVE</MenuItem>
              <MenuItem value="HALF_DAY">HALF DAY</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Check-In Time" fullWidth value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            <TextField label="Check-Out Time" fullWidth value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Update Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
