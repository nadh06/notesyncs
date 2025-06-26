// app/layout.js

import { Inter } from 'next/font/google';
import './globals.css'; // Your global styles (e.g., Tailwind CSS base styles)
import { AuthUserProvider } from '../contexts/AuthContext'; // Adjust path as needed

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'NoteSync Firebase App',
  description: 'A Next.js app with Firebase Authentication and Firestore for notes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap children with AuthUserProvider to provide Firebase context */}
        <AuthUserProvider>
          {children}
        </AuthUserProvider>
      </body>
    </html>
  );
}