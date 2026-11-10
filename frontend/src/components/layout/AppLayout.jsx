import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-main dark:bg-warmdark-main text-cream-text dark:text-warmdark-text flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-100 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <main className="flex-1 overflow-x-hidden">
          <Outlet context={{ setMobileOpen }} />
        </main>
      </div>
    </div>
  );
}
