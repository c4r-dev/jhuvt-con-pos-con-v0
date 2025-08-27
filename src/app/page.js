'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to activity-1 page
    router.push('/pages/activity-1');
  }, [router]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Redirecting to Neuroserpin Activity...</h1>
      </main>
    </div>
  );
}
