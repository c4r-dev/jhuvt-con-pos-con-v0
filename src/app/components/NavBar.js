'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavBar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <>
      <button 
        className="navbar-toggle-btn"
        onClick={toggleNavbar}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>
      
      <nav className={`app-navbar ${isOpen ? 'open' : 'closed'}`}>
        <div className="app-navbar-header">
          <div className="app-logo">Flow Designer</div>
          <button 
            className="navbar-close-btn" 
            onClick={toggleNavbar}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>
        <div className="nav-links">
          <Link href="/pages/designer" className={pathname.includes('/pages/designer') ? 'active' : ''}>
            Designer
          </Link>
          <Link href="/pages/flow-viewer" className={pathname.includes('/pages/flow-viewer') ? 'active' : ''}>
            Flow Viewer
          </Link>
          <Link href="/pages/word-cloud-testing" className={pathname.includes('/pages/word-cloud-testing') ? 'active' : ''}>
            Concern Grouping Demo
          </Link>       
          <Link href="/pages/activity-1" className={pathname.includes('/pages/activity-1') ? 'active' : ''}>
            Activity 1 (Concern Identification)
          </Link>
          <Link href="/pages/word-cloud" className={pathname.includes('/pages/word-cloud') ? 'active' : ''}>
            Activity 2 (Word Cloud)
          </Link>
        </div>
      </nav>
    </>
  );
};

export default NavBar; 