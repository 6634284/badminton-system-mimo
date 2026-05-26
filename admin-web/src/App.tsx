import { Routes, Route, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivityListPage from './pages/activities/ActivityListPage';
import ActivityDetailPage from './pages/activities/ActivityDetailPage';
import MemberListPage from './pages/members/MemberListPage';
import VenueListPage from './pages/venues/VenueListPage';
import WalletListPage from './pages/wallets/WalletListPage';
import StaffPage from './pages/staff/StaffPage';
import TenantManagePage from './pages/tenants/TenantManagePage';
import RefundPage from './pages/refunds/RefundPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProductListPage from './pages/mall/ProductListPage';
import TournamentListPage from './pages/tournaments/TournamentListPage';
import CoachListPage from './pages/coaches/CoachListPage';
import CouponListPage from './pages/coupons/CouponListPage';
import BookingPage from './pages/bookings/BookingPage';
import NotificationPage from './pages/notifications/NotificationPage';
import TemplatePage from './pages/activities/TemplatePage';
import HealthPage from './pages/system/HealthPage';
import NotificationTemplatePage from './pages/system/NotificationTemplatePage';
import WechatPayPage from './pages/system/WechatPayPage';
import ExportPage from './pages/system/ExportPage';
import { useAuthStore } from './stores/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <BasicLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="activities" element={<ActivityListPage />} />
        <Route path="activities/:id" element={<ActivityDetailPage />} />
        <Route path="members" element={<MemberListPage />} />
        <Route path="venues" element={<VenueListPage />} />
        <Route path="wallets" element={<WalletListPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="tenants" element={<TenantManagePage />} />
        <Route path="refunds" element={<RefundPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="mall/products" element={<ProductListPage />} />
        <Route path="tournaments" element={<TournamentListPage />} />
        <Route path="coaches" element={<CoachListPage />} />
        <Route path="coupons" element={<CouponListPage />} />
        <Route path="bookings" element={<BookingPage />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="templates" element={<TemplatePage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="notification-templates" element={<NotificationTemplatePage />} />
        <Route path="wechat-pay" element={<WechatPayPage />} />
        <Route path="exports" element={<ExportPage />} />
      </Route>
    </Routes>
  );
}
