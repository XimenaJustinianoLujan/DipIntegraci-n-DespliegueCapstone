export default function Footer() {
  return (
    <footer style={styles.footer}>
      <p>&copy; {new Date().getFullYear()} Clinica - Plataforma de Citas Medicas. Todos los derechos reservados.</p>
    </footer>
  );
}

const styles = {
  footer: {
    textAlign: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: '0.85rem',
    marginTop: 'auto',
  },
};
