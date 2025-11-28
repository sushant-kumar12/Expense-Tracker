import React from "react";

export default function Layout({ children }) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      {children}
    </div>
  );
}
