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
          <div style={styles.content}>
            <Outlet />
          </div>
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
    backgroundColor: 'var(--color-bg)',
  },
  body: {
    display: 'flex',
    flex: 1,
    alignItems: 'stretch',
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: '2rem',
    backgroundColor: 'var(--color-bg)',
  },
  content: {
    maxWidth: '1120px',
    margin: '0 auto',
    width: '100%',
  },
};
