'use client';

import { useEffect } from 'react';

export default function CacheBuster() {
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        // Check if we need to bust cache (you can version this later if needed)
        // For now, we aggressive unregister everything to fix the stale logo issue.
        // The PushNotificationManager will re-register the correct sw.js afterwards.

        // We can also try to clear caches
        caches.keys().then((names) => {
            names.forEach((name) => {
                console.log('Deleting cache:', name);
                caches.delete(name);
            });
        });

        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                console.log('Unregistering SW:', registration);
                registration.unregister();
            }
        });

    }, []);

    return null;
}
