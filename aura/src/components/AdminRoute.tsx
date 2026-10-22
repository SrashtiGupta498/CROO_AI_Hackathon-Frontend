import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

/**
 * True when the user has the admin role. Handles both the capital `Role`
 * field returned by /users/login and the lowercase `role` from social login.
 */
export const isAdminUser = (user: any): boolean => {
  const role = user?.Role ?? user?.role;
  return String(role || "").toLowerCase() === "admin";
};

/**
 * Route guard for the /admin/* content-studio routes. Anonymous visitors are
 * sent to login; signed-in non-admins are bounced to the home page. This is a
 * UX gate — the backend RolesGuard is the real enforcement.
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSelector((state: RootState) => state.user);

  if (!currentUser) return <Navigate to="/Login" replace />;
  if (!isAdminUser(currentUser)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AdminRoute;
