export async function sendSMS(to: string, message: string) {
    // In a real application, you would integrate with a provider like Twilio, Link Mobility, etc.
    // For now, we will log the message to the console.
    
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
