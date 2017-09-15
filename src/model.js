const { Store } = require('db-plumbing-map');
const uuid =  require('uuid/v4');
const Immutable = require('immutable-base');
const ImmutableMap = require('immutable-es6-map');
const Stream = require('iterator-plumbing');
const List = require('immutable-list');
const debug = require('debug')('app-plumbing-security-server');


//TODO: need a way to stop a role from propagating access rights to children (? a 'DENY' role?)

const ROLE_DEFAULTS = {
	resources: List.EMPTY,
	actions: List.EMPTY,
	name: '',
	uid: uuid()
};

class Role extends Immutable(ROLE_DEFAULTS) {

	static fromJSON(props) {
		props = Object.assign({}, props, { 
			resources: List.from(props.resources).map(r => r.split('/')), 
			actions: List.from(props.actions)
		}); 
		return new Role(props);
	}

	toJSON() {
		return Object.assign({}, this, { 
			resources: this.resources.map(r=>r.join('/')).toJSON(),
			actions: this.actions.toJSON()
		} );
	}

	matchesResource(resource) {
		debug('matchesResource %j,%j', this.resources, resource);
		for (let role_resource of this.resources) {
			let depth = 0;
			let match = true;
			while (match && depth < resource.length && depth < role_resource.length)
			{
				match = role_resource[depth] === '*' || role_resource[depth] === resource[depth];
				depth++;
			}
			if (match && depth === role_resource.length) {
				debug('matched', this.name);
				return true;
			}
		}
		return false;
	}
}

const GUEST_ROLE = new Role([['*']],['GET'],'guest');
const ADMIN_ROLE = new Role([['*']],['GET','PUT','DELETE','PATCH'],'admin');

const DEFAULT_ROLES = List.from(['guest']);

const USER_DEFAULTS = {
	name: "",
	email: "",
	domainRoles: ImmutableMap.from([[ 'default', DEFAULT_ROLES]])
};

class User extends Immutable(USER_DEFAULTS) {

	static fromJSON(props) {
		props = Object.assign({}, props, { 
			// TODO: Allow instantiation of ImmutableMap direct from stream
			domainRoles: ImmutableMap.from(Stream.of(props.domainRoles).map(entry=>[entry[0], List.from(entry[1])]).toMap())
		}); 
		return new User(props);		
	}

	canDo(domain, resource, action) {
		debug('User.canDo', domain.name, resource, action);
		if (resource.charAt(0)==='/') resource = resource.slice(1);
		let roles_needed = domain.getRolesFor(resource, action);
		let roles_posessed = this.domainRoles.get(domain.name) || List.EMPTY;
		debug('need %j, have %j', roles_needed, roles_posessed);
		return roles_needed.some(role => roles_posessed.includes(role));
	}

	get uid() { return this.name; }
}

User.Store = new Store(User);


const DOMAIN_DEFAULTS = {
	name: 'default',
	roles: List.from([ GUEST_ROLE, ADMIN_ROLE ])
};

const DOMAIN_ATTR_PROPS = {
	roles: { 
		elementType: List,
		collectionElementType: Role, 
		collectionElementIdentity: role=>role.uid 
	}
}


class SecurityDomain extends Immutable(DOMAIN_DEFAULTS) {

	constructor(props) {
		super(props);
	}

	getRolesFor(resource, action) {
		debug('getRolesFor', resource, action);
		if (typeof resource === 'string') resource = resource.split('/');
		return this.roles
			.filter( role => role.actions.includes(action) && role.matchesResource(resource) )
			.map(role => role.name);
	}

	static fromJSON(props) {
		debug('SecurityDomain.fromJSON', props.name);
		props = Object.assign({}, props, { 
			roles: List.from(props.roles).map(role => Role.fromJSON(role)) 
		}); 
		return new SecurityDomain(props);
	}

	static getAttrProps(name) {
		return DOMAIN_ATTR_PROPS[name];
	}

	get uid() { return this.name; }
}

SecurityDomain.Store = new Store(SecurityDomain);

module.exports = { User, Role, SecurityDomain };