import React from "react";
import { SvgIcon } from "@mui/material";

export default function CustomEditIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M12 3H6A3 3 0 0 0 3 6v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.4 2.6a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.4 2.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16.5"
        y1="4.5"
        x2="19.5"
        y2="7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}
