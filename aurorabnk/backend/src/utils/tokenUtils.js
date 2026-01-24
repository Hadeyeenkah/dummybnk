const jwt = require('jsonwebtoken');

exports.generateTokens = (userId) => {
	// Use env secrets, with safe dev defaults for local testing
	const accessSecret = process.env.JWT_SECRET || 'dev-access-secret-change-me';
	const refreshSecret = process.env.JWT_REFRESH_SECRET || accessSecret;

	const accessToken = jwt.sign({ userId }, accessSecret, {
		expiresIn: process.env.JWT_EXPIRE || '15m',
	});

	const refreshToken = jwt.sign({ userId }, refreshSecret, {
		expiresIn: '7d',
	});

	return { accessToken, refreshToken };
};

exports.setAuthCookies = (res, { accessToken, refreshToken }) => {
	const isProd = process.env.NODE_ENV === 'production';
	// Always use lax and secure: false in development
	const cookieOptions = {
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		path: '/',
		domain: undefined,
	};

	console.log('🍪 Setting auth cookies with options:', { 
		...cookieOptions, 
		nodeEnv: process.env.NODE_ENV,
		isProd,
		requestHost: res.req?.get('host')
	});

	res.cookie('accessToken', accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000, // 15 minutes
	});

	res.cookie('refreshToken', refreshToken, {
		...cookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
};
