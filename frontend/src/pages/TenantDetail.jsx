import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Grid, Card, CardContent, Typography, Box, Button, Avatar, Chip, Divider, List, ListItem, ListItemIcon, ListItemText
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  GetApp as DownloadIcon,
  Description as DocIcon,
  CalendarToday as DateIcon,
  Payment as CashIcon,
} from "@mui/icons-material";
import api from "../services/api";

export default function TenantDetail() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await api.get(`/tenants/${id}`);
        setTenant(response.data);
      } catch (err) {
        console.error("Failed to load tenant details:", err);
      }
    };
    fetchTenant();
  }, [id]);

  if (!tenant) return <Typography>Loading tenant details...</Typography>;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Button variant="outlined" startIcon={<BackIcon />} component={Link} to="/tenants">
          Back
        </Button>
        <Typography variant="h5" fontWeight={700}>Tenant Profile</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Card & Info */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, gap: { xs: 2, sm: 3 }, mb: 3 }}>
                <Avatar sx={{ bgcolor: "secondary.main", width: 64, height: 64, fontSize: "1.5rem" }}>
                  {tenant.full_name[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{tenant.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    {tenant.room_bed}
                  </Typography>
                  <Chip label={tenant.status} color="success" size="small" sx={{ mt: 1 }} />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Personal Information</Typography>
              <List dense sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><PhoneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Phone" secondary={tenant.phone} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><EmailIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Email" secondary={tenant.email} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><DateIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Check-In Date" secondary={tenant.check_in_date} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><CashIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Security Deposit" secondary={`₹${tenant.security_deposit || 0}`} />
                </ListItem>
                {tenant.check_out_date && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}><DateIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Check-Out Date" secondary={tenant.check_out_date} />
                  </ListItem>
                )}
              </List>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Emergency Contact</Typography>
              <Box sx={{ bgcolor: "background.default", p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" fontWeight={600}>{typeof tenant.emergency_contact === "object" ? tenant.emergency_contact?.name || "N/A" : tenant.emergency_contact || "N/A"}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{typeof tenant.emergency_contact === "object" ? tenant.emergency_contact?.relationship || "" : ""}</Typography>
                {typeof tenant.emergency_contact === "object" && tenant.emergency_contact?.phone && (
                  <Typography variant="body2" sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 14 }} /> {tenant.emergency_contact.phone}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Verification Documents */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>Verification Documents</Typography>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[
                  { name: "Aadhaar Card", path: tenant.aadhaar_number },
                  { name: "PAN Card", path: tenant.pan_number },
                  { name: "Passport", path: tenant.passport_number },
                  { name: "Driving License", path: tenant.driving_license },
                ].filter(d => d.path).map((doc, index) => {
                  const url = doc.path.startsWith("http") ? doc.path : `http://localhost:8000/${doc.path}`;
                  return (
                    <Card key={index} variant="outlined" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderColor: "divider" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1 }}>
                        <DocIcon sx={{ color: "primary.light" }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{doc.name}</Typography>
                          <Typography variant="caption" color="text.secondary">Document Verified</Typography>
                        </Box>
                      </Box>
                      <IconButton size="small" color="primary" component="a" href={url} target="_blank">
                        <DownloadIcon />
                      </IconButton>
                    </Card>
                  );
                })}

                {!tenant.aadhaar_number && !tenant.pan_number && !tenant.passport_number && !tenant.driving_license && (
                  <Typography variant="body2" color="text.secondary">No verification documents uploaded.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
