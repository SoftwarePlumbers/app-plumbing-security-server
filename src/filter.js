const { SecurityDomain, User } = require('./model');

const debug = require('debug')('app-plumbing-security-server');

function filter(req,res,next) {
	debug('filter', req.user, req.securityDomain);
	 // Authentication will have set the user id but not the full User object.
	getUser = req.user 
		? User.Store.find(req.user)
		: User.Store.find('guest');

	// Authentication (or some other filter) may set domain
	getDomain = req.securityDomain
		? SecurityDomain.Store.find(req.securityDomain)
		: SecurityDomain.Store.find('default');

	Promise.all([getUser, getDomain])
		.then(([user,domain])=> {
			debug('processed credintials', user.name, domain.name);

			if (user.canDo(domain, req.url, req.method)) {
				debug('authorized', user.name, domain.name, req.url);
				req.user = user;
				req.securityDomain = domain;
				next();
			} else {
				debug('forbidden', req.user, req.securityDomain, req.url);
				res.sendStatus(403);
			}
		}).catch(err=>{
			debug(err);
			res.sendStatus(500);
		});
}

module.exports = filter;