"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { LayoutDashboard, Zap, Tool, ShoppingBag, MessageSquare, LogOut } from "lucide-react";
import styles from "./Sidebar.module.css";

const routes = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/generators", icon: Zap, label: "Generators" },
  { href: "/dashboard/tools", icon: Tool, label: "PrimeTools" },
  { href: "/dashboard/shop", icon: ShoppingBag, label: "Shop" },
  { href: "/dashboard/tickets", icon: MessageSquare, label: "Tickets" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>Prime<span className={styles.accent}>Gen</span></h2>
      </div>

      <nav className={styles.nav}>
        {routes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link key={route.href} href={route.href} className={`${styles.link} ${isActive ? styles.active : ""}`}>
              <route.icon className={styles.icon} />
              {route.label}
              {isActive && (
                <motion.div layoutId="activeNav" className={styles.activeBg} />
              )}
            </Link>
          );
        })}
      </nav>

      <button className={styles.logoutBtn} onClick={() => signOut()}>
        <LogOut className={styles.icon} /> Logout
      </button>
    </aside>
  );
}
