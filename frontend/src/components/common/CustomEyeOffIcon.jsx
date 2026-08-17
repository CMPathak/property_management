import React from "react";
import { SvgIcon } from "@mui/material";

export default function CustomEyeOffIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Eye shape */}
      <path
        d="M1 12s4-7.5 11-7.5 11 7.5 11 7.5-4 7.5-11 7.5S1 12 1 12z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      {/* Diagonal slash line */}
      <line
        x1="4"
        y1="20"
        x2="20"
        y2="4"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="20"
        x2="20"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}
