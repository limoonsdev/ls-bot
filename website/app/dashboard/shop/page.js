"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import styles from "./shop.module.css";

export default function Shop() {
  const plans = [
    {
      id: "premium",
      name: "Premium",
      price: "4.99",
      features: [
        "Access to Premium Generators",
        "50 Generations per day",
        "1 minute cooldown",
        "Access to PrimeTools"
      ],
      style: "premium"
    },
    {
      id: "prime",
      name: "Prime",
      price: "9.99",
      features: [
        "Everything in Premium",
        "Unlimited Generations",
        "No Cooldowns",
        "Priority Support",
        "Exclusive Prime Accounts"
      ],
      style: "prime",
      badge: "Best Value"
    }
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Upgrade Your Experience</h1>
      <p className={styles.subtitle}>Unlock the full potential of PrimeGen with our VIP plans.</p>

      <div className={styles.grid}>
        {plans.map((plan, i) => (
          <motion.div 
            key={plan.id}
            className={`${styles.card} ${styles[plan.style]}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            {plan.badge && <div className={styles.badge}>{plan.badge}</div>}
            <h3 className={styles.tierName}>{plan.name}</h3>
            <div className={styles.price}>
              ${plan.price}<span>/month</span>
            </div>

            <div className={styles.features}>
              {plan.features.map((feat, j) => (
                <div key={j} className={styles.feature}>
                  <Check size={20} className={styles.icon} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <button className={styles.buyBtn}>
              Purchase {plan.name}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
