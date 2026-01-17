
import webPush from 'web-push';

// Configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@vaktplan.no';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️ VAPID keys are missing from environment variables. Web Push will not work.');
} else {
    webPush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export async function sendWebPush(subscription: any, payload: string | object) {
    try {
        const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
        await webPush.sendNotification(subscription, payloadString);
        console.log('✅ Web Push sent successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending Web Push:', error);
        return { success: false, error };
    }
}
