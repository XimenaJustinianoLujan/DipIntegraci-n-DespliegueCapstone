import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Patient pages
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import MedicalRecord from './pages/patient/MedicalRecord';

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard';
import Schedule from './pages/doctor/Schedule';
import AttendPatient from './pages/doctor/AttendPatient';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageDoctors from './pages/admin/ManageDoctors';
import SundayShifts from './pages/admin/SundayShifts';

// Secretary pages
import SecretaryDashboard from './pages/secretary/Dashboard';

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const routes = {
    paciente: '/paciente',
    medico: '/medico',
    administrador: '/admin',
    secretaria: '/secretaria',
  };

  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Home redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Patient routes */}
            <Route
              path="/paciente"
              element={
                <ProtectedRoute allowedRoles={['paciente']}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/agendar"
              element={
                <ProtectedRoute allowedRoles={['paciente']}>
                  <BookAppointment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/mis-citas"
              element={
                <ProtectedRoute allowedRoles={['paciente']}>
                  <MyAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/ficha-clinica"
              element={
                <ProtectedRoute allowedRoles={['paciente']}>
                  <MedicalRecord />
                </ProtectedRoute>
              }
            />

            {/* Doctor routes */}
            <Route
              path="/medico"
              element={
                <ProtectedRoute allowedRoles={['medico']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/agenda"
              element={
                <ProtectedRoute allowedRoles={['medico']}>
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/atender"
              element={
                <ProtectedRoute allowedRoles={['medico']}>
                  <AttendPatient />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/medicos"
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <ManageDoctors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/turnos-domingo"
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <SundayShifts />
                </ProtectedRoute>
              }
            />

            {/* Secretary routes */}
            <Route
              path="/secretaria"
              element={
                <ProtectedRoute allowedRoles={['secretaria']}>
                  <SecretaryDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
