"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import styles from "./tickets.module.css";
import { useSession } from "next-auth/react";

export default function Tickets() {
  const { data: session } = useSession();
  const [ticketId, setTicketId] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const createTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "1532347064623698010", // Real integration uses session id
          username: session?.user?.name || "User",
          subject: subject,
          message: message
        })
      });
      const data = await res.json();
      if (data.channelId) {
        setTicketId(data.channelId);
        setChat([{ sender: "user", text: message }]);
        setMessage("");
      }
    } catch(err) {
      alert("Failed to create ticket");
    }
    setLoading(false);
  };

  const sendMessage = () => {
    if (!message) return;
    setChat([...chat, { sender: "user", text: message }]);
    setMessage("");
    // In a real app, send this to the API so Discord updates
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Support Tickets</h1>

      {!ticketId ? (
        <motion.div 
          className={styles.createTicket}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2>Open a new ticket</h2>
          <p style={{color: "var(--text-secondary)", marginBottom: "1rem"}}>Our staff is available on Discord and will reply here.</p>
          
          <input 
            type="text" 
            placeholder="Subject" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Describe your issue..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            className={styles.createBtn}
            onClick={createTicket}
            disabled={!subject || !message || loading}
          >
            {loading ? "Opening..." : "Create Ticket"}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          className={styles.chatBox}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.header}>
            <h2>{subject}</h2>
            <span className={styles.status}>Open</span>
          </div>

          <div className={styles.messages}>
            {chat.map((msg, i) => (
              <div key={i} className={`${styles.messageRow} ${styles[msg.sender]}`}>
                <div className={styles.bubble}>{msg.text}</div>
              </div>
            ))}
          </div>

          <div className={styles.inputArea}>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className={styles.sendBtn} onClick={sendMessage}>
              <Send size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
