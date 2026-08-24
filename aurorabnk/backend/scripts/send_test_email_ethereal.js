const nodemailer = require('nodemailer');

async function run() {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const to = process.argv[2] || 'recipient@example.com';
    const info = await transporter.sendMail({
      from: testAccount.user,
      to,
      subject: 'Aurora Bank test notification (Ethereal)',
      text: 'This is a test notification sent using Ethereal (nodemailer).',
      html: '<p>This is a <b>test notification</b> sent using Ethereal (nodemailer).</p>',
    });

    console.log('Message sent. Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('\nEthereal account credentials (for debugging):');
    console.log('  user:', testAccount.user);
    console.log('  pass:', testAccount.pass);
  } catch (err) {
    console.error('Failed to send test email:', err);
    process.exitCode = 1;
  }
}

run();
