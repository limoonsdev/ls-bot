"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Key } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") return null;

  return (
    <main className={styles.main}>
      <motion.div 
        className={styles.hero}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className={styles.title}>Welcome to <span className={styles.gradientText}>PrimeGen</span></h1>
        <p className={styles.subtitle}>The ultimate premium suite for developers and enthusiasts.</p>
        
        <button className={styles.loginBtn} onClick={() => signIn("discord")}>
          Login with Discord
        </button>
      </motion.div>

      <div className={styles.features}>
        {[
          { icon: Zap, title: "Lightning Fast", desc: "Our generators work in milliseconds." },
          { icon: Shield, title: "Ultra Secure", desc: "Your data is protected with military-grade encryption." },
          { icon: Key, title: "Premium Access", desc: "VIP tools exclusive to PrimeGen." }
        ].map((feat, i) => (
          <motion.div 
            key={i} 
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <feat.icon className={styles.icon} />
            <h3>{feat.title}</h3>
            <p>{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
