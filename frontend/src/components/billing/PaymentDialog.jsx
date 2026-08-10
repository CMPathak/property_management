import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  CircularProgress,
  IconButton
} from "@mui/material";
import { Close as CloseIcon, CloudUpload as CloudUploadIcon, ContentCopy as CopyIcon } from "@mui/icons-material";
import api from "../../services/api";

export default function PaymentDialog({ open, onClose, invoice, onSuccess }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (open && invoice) {
      fetchSettings();
    }
  }, [open, invoice]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rent/payment-settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to load payment settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUpi = () => {
    if (settings?.upi_id) {
      navigator.clipboard.writeText(settings.upi_id);
    }
  };

  const handleSubmit = async () => {
    if (!transactionId) {
      alert("Please enter Transaction ID (UTR)");
      return;
    }
    
    try {
      setSubmitting(true);
      
      const payload = {
        invoice_id: invoice.id,
        amount: invoice.total_amount - invoice.paid_amount,
        payment_mode: "ONLINE",
        transaction_id: transactionId,
        remarks: remarks,
        // In a real app, proofFile would be uploaded to a storage service first and the URL sent here
        payment_proof: proofFile ? "uploaded_proof_placeholder.png" : null
      };
      
      await api.post("/rent/payments/submit", payload);
      
      onSuccess();
    } catch (err) {
      console.error("Payment submission failed:", err);
      alert("Failed to submit payment details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "16px" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" fontWeight={800} color="#0F172A">
          Pay Rent
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : settings ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ bgcolor: "#F8FAFC", p: 2, borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <Typography variant="body2" color="#64748B" mb={1}>Payment Details</Typography>
              <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>
                ₹{(invoice.total_amount - invoice.paid_amount).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="#64748B">
                Invoice: {invoice.invoice_no} | Due: {invoice.due_date}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Typography variant="body1" fontWeight={600} color="#334155">
                Scan QR Code to Pay
              </Typography>
              
              {settings.qr_code_image ? (
                <Box component="img" src={settings.qr_code_image} sx={{ width: 200, height: 200, borderRadius: 2, border: "1px solid #E2E8F0" }} />
              ) : (
                <Box sx={{ width: 200, height: 200, bgcolor: "#F1F5F9", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="caption" color="#94A3B8">QR Code Unavailable</Typography>
                </Box>
              )}
              
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#F1F5F9", p: 1, px: 2, borderRadius: "8px" }}>
                <Typography variant="body2" fontWeight={600}>{settings.upi_id}</Typography>
                <IconButton size="small" onClick={handleCopyUpi}><CopyIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
              
              {settings.account_holder && (
                <Typography variant="caption" color="#64748B">Name: {settings.account_holder}</Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body1" fontWeight={600} color="#334155" borderBottom="1px solid #E2E8F0" pb={1}>
                Submit Payment Details
              </Typography>
              
              <TextField
                label="Transaction ID (UTR)"
                fullWidth
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter 12-digit UTR number"
              />
              
              <TextField
                label="Remarks (Optional)"
                fullWidth
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ justifyContent: "flex-start", textTransform: "none", color: "#64748B", borderColor: "#CBD5E1" }}
              >
                {proofFile ? proofFile.name : "Upload Payment Screenshot"}
                <input type="file" hidden accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} />
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography color="error">Payment settings not configured by owner.</Typography>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} sx={{ color: "#64748B", textTransform: "none" }}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!settings || !transactionId || submitting}
          sx={{ bgcolor: "#2563EB", textTransform: "none", "&:hover": { bgcolor: "#1D4ED8" }, px: 3 }}
        >
          {submitting ? "Submitting..." : "Submit Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
