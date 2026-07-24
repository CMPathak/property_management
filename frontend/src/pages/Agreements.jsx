import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Add as AddIcon, Description as DocIcon, GetApp as DownloadIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";

export default function Agreements() {
  const [agreements, setAgreements] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  // Add form state
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const fetchData = async () => {
    try {
      const tenantsRes = await api.get("/tenants/");
      const tenantsData = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
      setTenants(tenantsData);

      // Extract lease agreements or synthesize list
      let agreementList = [];
      tenantsData.forEach((t) => {
        if (t.agreements && Array.isArray(t.agreements)) {
          t.agreements.forEach((a) => {
            agreementList.push({
              ...a,
              tenant_name: t.full_name || t.email,
              room_bed: t.room_bed || "Allocated",
            });
          });
        } else if (t.room_bed && t.room_bed !== "Not Allocated") {
          agreementList.push({
            id: `agr-${t.id}`,
            tenant_name: t.full_name || t.email,
            room_bed: t.room_bed,
            start_date: t.check_in_date || "2026-07-01",
            end_date: t.check_out_date || "2027-06-30",
            monthly_rent: t.monthly_rent || 6000,
            security_deposit: t.security_deposit || 10000,
            status: "ACTIVE",
          });
        }
      });
      setAgreements(agreementList);
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      setAgreements([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAgreement = async () => {
    if (!selectedTenantId) {
      alert("Please select a tenant.");
      return;
    }
    try {
      const payload = {
        tenant_profile_id: selectedTenantId,
        start_date: startDate,
        end_date: endDate || null,
        monthly_rent: parseFloat(monthlyRent) || 0,
        security_deposit: parseFloat(securityDeposit) || 0,
        terms_and_conditions: "Standard PG Rental Lease Agreement.",
      };
      await api.post("/agreements/", payload);
      setOpenAddDialog(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create agreement.");
    }
  };

  const columns = [
    {
      id: "tenant_name",
      label: "Tenant Name",
      render: (a) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DocIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700}>
            {a.tenant_name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "room_bed",
      label: "Allocation",
      render: (a) => <Chip label={a.room_bed} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "start_date",
      label: "Start Date",
      render: (a) => a.start_date || "—",
    },
    {
      id: "end_date",
      label: "End Date",
      render: (a) => a.end_date || "—",
    },
    {
      id: "monthly_rent",
      label: "Rent (₹)",
      render: (a) => `₹${(a.monthly_rent || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "status",
      label: "Status",
      render: (a) => (
        <Chip
          label={a.status || "ACTIVE"}
          size="small"
          color={a.status === "EXPIRED" ? "error" : "success"}
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
            Lease Agreements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage tenant rental contracts, check-in terms, deposit rules, and active leases.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
          New Agreement
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={agreements}
        searchPlaceholder="Search by tenant or room allocation..."
        emptyMessage="No active rental agreements found."
        actions={[
          { label: "Download Contract", icon: <DownloadIcon fontSize="small" />, onClick: () => alert("Agreement PDF downloaded!") },
        ]}
      />

      {/* Add Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Create Rental Agreement</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel id="tenant-agr-select">Select Tenant</InputLabel>
            <Select labelId="tenant-agr-select" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} label="Select Tenant">
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.full_name || t.email} ({t.room_bed || "Not Allocated"})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <TextField label="Start Date" type="date" fullWidth value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" fullWidth value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Monthly Rent (₹)" type="number" fullWidth value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
            <TextField label="Security Deposit (₹)" type="number" fullWidth value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAgreement} variant="contained" color="primary">
            Save Agreement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
