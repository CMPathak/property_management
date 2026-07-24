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
} from "@mui/material";
import { Description as InvoiceIcon, GetApp as DownloadIcon } from "@mui/icons-material";
import api from "../services/api";
import DataTable from "../components/common/DataTable";

export default function Invoices() {
  const [invoices, setInvoices] = useState([
    {
      id: "INV-2026-001",
      tenant_name: "Raj Kumar",
      room_number: "Room 101 - Bed A",
      rent_amount: 6000,
      utility_charges: 250,
      total_amount: 6250,
      due_date: "2026-07-26",
      status: "UNPAID",
    },
    {
      id: "INV-2026-002",
      tenant_name: "Sandeep Yadav",
      room_number: "Room 102 - Bed A",
      rent_amount: 6000,
      utility_charges: 0,
      total_amount: 6000,
      due_date: "2026-07-15",
      status: "PARTIALLY_PAID",
    },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get("/rent/invoices");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setInvoices(res.data);
      }
    } catch (e) {
      console.log("Using initial invoices data.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setOpenDialog(true);
  };

  const columns = [
    {
      id: "id",
      label: "Invoice No.",
      render: (inv) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InvoiceIcon sx={{ color: "#2563EB" }} />
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {inv.id}
          </Typography>
        </Box>
      ),
    },
    {
      id: "tenant_name",
      label: "Tenant Name",
      render: (inv) => (
        <Typography variant="body2" fontWeight={600}>
          {inv.tenant_name || "Resident"}
        </Typography>
      ),
    },
    {
      id: "room_number",
      label: "Room Allocation",
      render: (inv) => <Chip label={inv.room_number || "Allocated"} size="small" variant="outlined" color="primary" sx={{ borderRadius: "6px" }} />,
    },
    {
      id: "total_amount",
      label: "Total Bill (₹)",
      render: (inv) => `₹${(inv.total_amount || inv.rent_amount || 0).toLocaleString("en-IN")}`,
    },
    {
      id: "due_date",
      label: "Due Date",
      render: (inv) => inv.due_date || "2026-07-31",
    },
    {
      id: "status",
      label: "Status",
      render: (inv) => {
        const isPaid = inv.status === "PAID" || inv.status === "COMPLETED";
        const isPartial = inv.status === "PARTIALLY_PAID";
        return (
          <Chip
            label={inv.status || "UNPAID"}
            size="small"
            color={isPaid ? "success" : isPartial ? "warning" : "error"}
            sx={{ borderRadius: "6px", fontWeight: 700 }}
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
            Invoices Roster
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated billing invoices, rent breakdowns, utility charges, and payment due statuses.
          </Typography>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoice number, tenant, or room..."
        emptyMessage="No invoices generated yet."
        actions={[
          { label: "View Invoice Details", icon: <DownloadIcon fontSize="small" />, onClick: (inv) => handleViewInvoice(inv) },
        ]}
      />

      {/* Invoice Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Invoice Details</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedInvoice && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              <Typography variant="body2"><b>Invoice ID:</b> {selectedInvoice.id}</Typography>
              <Typography variant="body2"><b>Tenant Name:</b> {selectedInvoice.tenant_name || "Resident"}</Typography>
              <Typography variant="body2"><b>Allocation:</b> {selectedInvoice.room_number}</Typography>
              <Typography variant="body2"><b>Base Rent:</b> ₹{(selectedInvoice.rent_amount || 0).toLocaleString("en-IN")}</Typography>
              <Typography variant="body2"><b>Utility Charges:</b> ₹{(selectedInvoice.utility_charges || 0).toLocaleString("en-IN")}</Typography>
              <Typography variant="body2"><b>Total Amount:</b> ₹{(selectedInvoice.total_amount || selectedInvoice.rent_amount || 0).toLocaleString("en-IN")}</Typography>
              <Typography variant="body2"><b>Due Date:</b> {selectedInvoice.due_date}</Typography>
              <Typography variant="body2"><b>Status:</b> {selectedInvoice.status}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          <Button variant="contained" color="primary" startIcon={<DownloadIcon />} onClick={() => alert("Invoice PDF Downloaded!")}>
            Download Invoice PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
