const email = require('../src/utils/email');

(async () => {
  const ok = await email.sendNotificationEmail('recipient@example.com', 'Notification helper test', 'Hello from sendNotificationEmail helper');
  console.log('sendNotificationEmail returned:', ok);
})();
