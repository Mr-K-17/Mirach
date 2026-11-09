import { createBrowserRouter, Navigate } from "react-router-dom";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { AppShell } from "./AppShell";
import { QuotaScreen } from "./screens/QuotaScreen";
import { MaintenanceScreen } from "./screens/MaintenanceScreen";
import {
  ChatsPlaceholder,
  PeoplePlaceholder,
  NotificationsPlaceholder,
  MePlaceholder,
  AdminPlaceholder,
  JoinPlaceholder,
  PendingPlaceholder,
  RejectedPlaceholder,
  NotFoundScreen
} from "./screens/Placeholders";

export const router = createBrowserRouter([
  // Public Onboarding Routes
  {
    path: "/",
    element: <WelcomeScreen />
  },
  {
    path: "/login",
    element: <WelcomeScreen />
  },
  {
    path: "/join",
    element: <JoinPlaceholder />
  },
  {
    path: "/pending",
    element: <PendingPlaceholder />
  },
  {
    path: "/rejected",
    element: <RejectedPlaceholder />
  },

  // Member Application Shell
  {
    path: "/app",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/chats" replace />
      },
      {
        path: "chats",
        element: <ChatsPlaceholder />
      },
      {
        path: "people",
        element: <PeoplePlaceholder />
      },
      {
        path: "notifications",
        element: <NotificationsPlaceholder />
      },
      {
        path: "me",
        element: <MePlaceholder />
      }
    ]
  },

  // Admin Shell
  {
    path: "/admin",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/overview" replace />
      },
      {
        path: "overview",
        element: <AdminPlaceholder />
      }
    ]
  },

  // Operational State Screens
  {
    path: "/quota",
    element: <QuotaScreen />
  },
  {
    path: "/maintenance",
    element: <MaintenanceScreen />
  },

  // 404 Not Found
  {
    path: "*",
    element: <NotFoundScreen />
  }
]);
