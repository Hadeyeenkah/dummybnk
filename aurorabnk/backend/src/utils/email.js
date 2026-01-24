exports.sendVerificationEmail = async (email, link) => {
  // For now, log the verification link. Integrate with provider (e.g., SendGrid) later.
  console.log(`[EMAIL] Verification to ${email}: ${link}`);
  return true;
};

exports.sendPasswordResetEmail = async (email, resetLink, firstName) => {
  // For now, log the password reset link. Integrate with email provider later.
  console.log(`[EMAIL] Password reset to ${email}: ${resetLink}`);
  console.log(`Hello ${firstName}, click the link to reset your password: ${resetLink}`);
  return true;
};
