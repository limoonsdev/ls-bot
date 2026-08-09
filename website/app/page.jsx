'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random stars for the background
    const newStars = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 4}s`,
    }));
    setStars(newStars);
  }, []);

  return (
    <>
      <div className="bg-grid"></div>
      <div className="bg-glow"></div>
      
      {/* Random floating plus signs as stars */}
      {stars.map((star) => (
        <div 
          key={star.id} 
          className="star" 
          style={{ top: star.top, left: star.left, animationDelay: star.animationDelay }}
        >
          +
        </div>
      ))}

      {/* Language Toggle */}
      <div className="header">
        <button className="lang-btn active">EN</button>
        <button className="lang-btn">FR</button>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <div className="logo-container">
          <span className="logo-main">PrimeGen</span>
          <span className="logo-ext">.eu</span>
        </div>
        
        <div className="plus-icon">+</div>

        <a href="/api/auth/login" className="discord-btn">
          <svg className="discord-icon" viewBox="0 0 127.14 96.36">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
          </svg>
          Connect with Discord
        </a>

        <div className="stats-container">
          <div className="stat-pill">
            <span>users</span>
            <span className="stat-value">1822</span>
          </div>
          <div className="stat-dot"></div>
          <div className="stat-pill">
            <span>services</span>
            <span className="stat-value">12</span>
          </div>
          <div className="stat-dot"></div>
          <div className="stat-pill">
            <span>generated</span>
            <span className="stat-value">26674</span>
          </div>
        </div>
      </main>
    </>
  );
}
