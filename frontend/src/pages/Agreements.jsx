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
} from "@mui/material";
import { Add as AddIcon, Description as DocIcon, GetApp as DownloadIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";
import CustomEditIcon from "../components/common/CustomEditIcon";

export default function Agreements() {
  const user = useSelector((state) => state.auth.user);
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

      // Extract lease agreements dynamically from database records
      let agreementList = [];
      tenantsData.forEach((t) => {
        if (t.agreements && Array.isArray(t.agreements)) {
          t.agreements.forEach((a) => {
            agreementList.push({
              id: a.id,
              agreement_no: a.agreement_no || "—",
              tenant_profile_id: a.tenant_profile_id || a.tenant_id || t.id,
              tenant_name: t.full_name || t.email,
              room_bed: t.room_bed || "Allocated",
              start_date: a.start_date,
              end_date: a.end_date,
              monthly_rent: a.rent_amount || a.monthly_rent || 0,
              security_deposit: a.security_deposit || a.deposit_amount || 0,
              status: a.status || "ACTIVE",
            });
          });
        }
      });

      // Filter list for current tenant if user is TENANT
      if (user?.role === "TENANT") {
        agreementList = agreementList.filter(
          (a) =>
            (a.tenant_profile_id && a.tenant_profile_id === user.id) ||
            (a.tenant_name && user.full_name && a.tenant_name.toLowerCase() === user.full_name.toLowerCase()) ||
            (a.tenant_name && user.email && a.tenant_name.toLowerCase().includes(user.email.split("@")[0].toLowerCase())) ||
            (a.id === `agr-${user.id}`)
        );
      }

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
    if (!monthlyRent || parseFloat(monthlyRent) <= 0) {
      alert("Please enter a valid monthly rent.");
      return;
    }
    try {
      const payload = {
        tenant_id: selectedTenantId,
        start_date: startDate,
        end_date: endDate || null,
        rent_amount: parseFloat(monthlyRent) || 0,
        security_deposit: parseFloat(securityDeposit) || 0,
      };
      await api.post(`/tenants/${selectedTenantId}/agreements`, payload);
      setOpenAddDialog(false);
      setSelectedTenantId("");
      setMonthlyRent("");
      setSecurityDeposit("");
      setEndDate("");
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        alert(detail.map((d) => `${d.loc?.slice(1).join(".") || d.loc?.join(".")}: ${d.msg}`).join("\n"));
      } else if (typeof detail === "object" && detail !== null) {
        alert(JSON.stringify(detail));
      } else {
        alert(detail || err.message || "Failed to create agreement.");
      }
    }
  };

  const columns = [
    {
      id: "agreement_no",
      label: "Agreement No.",
      render: (a) => (
        <Chip
          label={a.agreement_no}
          size="small"
          sx={{ fontWeight: 700, fontFamily: "monospace", backgroundColor: "#F3F4F6", color: "#374151" }}
        />
      ),
    },
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

  const handleDownloadPdf = async (agreement) => {
    if (!agreement?.id) return;
    try {
      const response = await api.get(`/tenants/agreements/${agreement.id}/download-pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Agreement_${agreement.agreement_no || agreement.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download agreement PDF.");
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="fade-in">
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" tracking="-0.02em">
            Lease Agreements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role === "TENANT"
              ? "View your active rental contract, start date, security deposit rules, and terms."
              : "Manage tenant rental contracts, check-in terms, deposit rules, and active leases."}
          </Typography>
        </Box>
        {user?.role !== "TENANT" && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>
            New Agreement
          </Button>
        )}
      </Box>

      <DataTable
        columns={columns}
        data={agreements}
        searchPlaceholder="Search by tenant or room allocation..."
        emptyMessage="No active rental agreements found."
        actions={[
          { label: "Download Contract", icon: <DownloadIcon fontSize="small" />, onClick: (row) => handleDownloadPdf(row) },
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
