"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

const LoginButton = () => {
  const searchParams = useSearchParams();

  const isLoggedIn = searchParams?.get("loggedIn") === "true";

  const handleLogin = () => {
    window.location.href = "/api/trading/login";
  };

  return (
    <>
      {!isLoggedIn && (
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white text-lg rounded px-4 py-2"
        >
          Login
        </button>
      )}
    </>
  );
};

export default LoginButton;
