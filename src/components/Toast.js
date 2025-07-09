import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyle = () => {
    const baseStyle = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      maxWidth: '300px',
      wordWrap: 'break-word'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#4caf50' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#f44336' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#ff9800' };
      case 'info':
        return { ...baseStyle, backgroundColor: '#2196f3' };
      default:
        return { ...baseStyle, backgroundColor: '#4caf50' };
    }
  };

  return (
    <div style={getToastStyle()}>
      {message}
    </div>
  );
};

export default Toast; 