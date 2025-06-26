// pages/_app.js (for Pages Router)

import '../styles/globals.css'; // Your global styles (e.g., Tailwind CSS base styles)
import { AuthUserProvider } from '../contexts/AuthContext'; // Adjust path as needed

function MyApp({ Component, pageProps }) {
  return (
    <AuthUserProvider>
      <Component {...pageProps} />
    </AuthUserProvider>
  );
}

export default MyApp;