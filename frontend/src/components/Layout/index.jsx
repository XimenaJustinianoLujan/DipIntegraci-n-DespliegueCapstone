import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.body}>
        {isAuthenticated && <Sidebar />}
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  body: {
    display: 'flex',
    flex: 1,
  },
  main: {
    flex: 1,
    padding: '2rem',
    backgroundColor: '#f1f5f9',
  },
};
