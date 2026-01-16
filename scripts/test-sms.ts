
// This script simulates sending an SMS to the number provided by the user.
// Run with: npx ts-node -T scripts/test-sms.ts

async function sendSMS(to: string, message: string) {
    // Basic sanitization of phone number for logging
    const sanitizedNumber = to.replace(/\s+/g, '');

    console.log('---------------------------------------------------');
    console.log(`📱 MOCK SMS TO [${sanitizedNumber}]:`);
    console.log(`${message}`);
    console.log('---------------------------------------------------');

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));

    return { success: true };
}

async function main() {
    const phoneNumber = "90470150";
    console.log(`Sending test SMS to ${phoneNumber}...`);

    await sendSMS(phoneNumber, "Dette er en testmelding fra Vaktplan-appen. SMS-systemet fungerer!");
}

main().catch(console.error);
