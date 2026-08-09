"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import styles from "./generators.module.css";
import { useSession } from "next-auth/react";

export default function Generators() {
  const { data: session } = useSession();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genStatus, setGenStatus] = useState({});

  useEffect(() => {
    // Fetch from API
    fetch("http://localhost:3001/api/services")
      .then(res => res.json())
      .then(data => {
        setServices(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGenerate = async (id) => {
    setGenStatus(prev => ({...prev, [id]: "Generating..."}));
    try {
      const res = await fetch("http://localhost:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: id, userId: "1532347064623698010" }) // Dummy user id for now until NextAuth callbacks are mapped
      });
      const data = await res.json();
      if (data.error) {
        setGenStatus(prev => ({...prev, [id]: `Error: ${data.error}`}));
      } else {
        setGenStatus(prev => ({...prev, [id]: `Success! Check DMs`}));
      }
    } catch(err) {
      setGenStatus(prev => ({...prev, [id]: `Error!`}));
    }
    setTimeout(() => {
        setGenStatus(prev => ({...prev, [id]: null}));
    }, 5000);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Generators</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.grid}>
          {services.map((service, i) => (
            <motion.div 
              key={service.id} 
              className={styles.card}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={styles.cardHeader}>
                <Zap className={styles.icon} />
                <h3>{service.label}</h3>
              </div>
              <p className={styles.stock}>Tier: <span>{service.tier.toUpperCase()}</span></p>
              
              <button 
                className={styles.generateBtn}
                onClick={() => handleGenerate(service.id)}
                disabled={!!genStatus[service.id]}
              >
                {genStatus[service.id] || "Generate"}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
