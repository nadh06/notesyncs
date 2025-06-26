// app/page.js
'use client'; // This directive makes the component a client-side component

import React from 'react';
import NextjsFirebaseApp from '../components/NextjsFirebaseApp'; // Adjust path as needed

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans antialiased">
      <NextjsFirebaseApp />
    </div>
  );
}