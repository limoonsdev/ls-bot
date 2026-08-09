"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Mail, Key } from "lucide-react";
import styles from "./tools.module.css";
import { useSession } from "next-auth/react";

export default function PrimeTools() {
  const { data: session } = useSession();
  const [inputs, setInputs] = useState({ discord_token: "", discord_age: "" });
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const tools = [
    { id: "discord_token", title: "Token Checker", desc: "Extract the User ID from a Discord Token.", icon: Key, requiresInput: true, placeholder: "Paste Discord Token..." },
    { id: "discord_age", title: "ID to Age", desc: "Find out when a Discord account was created from its ID.", icon: Search, requiresInput: true, placeholder: "Paste User ID..." },
    { id: "tempmail", title: "Temp Mail Generator", desc: "Generate a fresh temporary email instantly.", icon: Mail, requiresInput: false }
  ];

  const handleAction = async (toolId) => {
    setLoading(prev => ({...prev, [toolId]: true}));
    try {
      const res = await fetch(`http://localhost:3001/api/tools/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "1532347064623698010", input: inputs[toolId] })
      });
      const data = await res.json();
      if (data.error) {
        setResults(prev => ({...prev, [toolId]: `Error: ${data.error}`}));
      } else {
        setResults(prev => ({...prev, [toolId]: data.result + (data.link ? ` (Check: ${data.link})` : "")}));
      }
    } catch(err) {
      setResults(prev => ({...prev, [toolId]: "Failed to connect to backend."}));
    }
    setLoading(prev => ({...prev, [toolId]: false}));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>PrimeTools <span style={{color: "var(--accent-purple)", fontSize: "1rem"}}>VIP Only</span></h1>
      
      <div className={styles.grid}>
        {tools.map((tool, i) => (
          <motion.div 
            key={tool.id} 
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className={styles.cardHeader}>
              <tool.icon className={styles.icon} />
              <h3>{tool.title}</h3>
            </div>
            <p className={styles.description}>{tool.desc}</p>
            
            {tool.requiresInput && (
              <input 
                type="text" 
                className={styles.input} 
                placeholder={tool.placeholder}
                value={inputs[tool.id] || ""}
                onChange={e => setInputs({...inputs, [tool.id]: e.target.value})}
              />
            )}
            
            <button 
              className={styles.actionBtn}
              onClick={() => handleAction(tool.id)}
              disabled={loading[tool.id] || (tool.requiresInput && !inputs[tool.id])}
            >
              {loading[tool.id] ? "Processing..." : "Execute"}
            </button>

            {results[tool.id] && (
              <div className={styles.result}>
                {results[tool.id]}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
