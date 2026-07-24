import React from "react";
import { SvgIcon } from "@mui/material";

export default function CustomEyeIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M1 12s4-7.5 11-7.5 11 7.5 11 7.5-4 7.5-11 7.5S1 12 1 12z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    </SvgIcon>
  );
}
