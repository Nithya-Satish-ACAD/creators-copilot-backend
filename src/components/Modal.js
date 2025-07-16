import React from "react";

export function ModalBase({ open, onClose, children, modalStyle: customModalStyle }) {
  if (!open) return null;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, ...customModalStyle }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function Modal(props) {
  return <ModalBase {...props} />;
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 2px 16px #0002",
  padding: "32px 24px 40px 24px",
  minWidth: 420,
  maxWidth: 520,
  width: "100%",
  height: "480px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center"
}; 