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
	// Use secure: true and sameSite: 'none' for cross-domain in production
	// Add Partitioned attribute for Safari/Apple devices
	const cookieOptions = {
		httpOnly: true,
		secure: isProd ? true : false,
		sameSite: isProd ? 'none' : 'lax',
		path: '/',
		domain: undefined,
	};

	console.log('🍪 Setting auth cookies with options:', { 
		...cookieOptions, 
		nodeEnv: process.env.NODE_ENV,
		isProd,
		requestHost: res.req?.get('host')
	});

	// For Safari/Apple devices: add Partitioned attribute via Set-Cookie header
	const partitionedAttr = isProd ? '; Partitioned' : '';

	res.cookie('accessToken', accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	
	// Manually set Partitioned attribute for Safari compatibility
	if (isProd) {
		const accessCookie = res.getHeader('Set-Cookie');
		if (Array.isArray(accessCookie)) {
			accessCookie[accessCookie.length - 1] += partitionedAttr;
			res.setHeader('Set-Cookie', accessCookie);
		} else if (accessCookie) {
			res.setHeader('Set-Cookie', accessCookie + partitionedAttr);
		}
	}

	res.cookie('refreshToken', refreshToken, {
		...cookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
	
	// Manually set Partitioned attribute for Safari compatibility
	if (isProd) {
		const cookies = res.getHeader('Set-Cookie');
		if (Array.isArray(cookies)) {
			cookies[cookies.length - 1] += partitionedAttr;
			res.setHeader('Set-Cookie', cookies);
		}
	}
};
