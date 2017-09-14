const { User, Role, SecurityDomain } = require('../src/model.js');
const chaiHttp = require('chai-http');
const debug = require('debug')('app-plumbing-security-server');
const chai = require('chai');
const { app, start, stop, setUser, setDomain } = require('./server');

const expect= chai.expect;
chai.use(chaiHttp);

const roles = [
    { name: "editor", resources: [ 'dev/blog' ], actions: ['PUT', 'post', 'delete', 'GET', 'patch']},
    { name: "contributor", resources: ['dev/blog'], actions: ['PUT', 'post', 'GET']},
    { name: "guest", resources: ['dev'], actions: ['GET']},
    { name: "guest", resources: ['dev/blog/*/comment'], actions: ['GET','post']},
    { name: "wiki", resources: ['dev/wiki','prod/wiki'], actions: ['PUT', 'post', 'del', 'GET']},
]

const domain = SecurityDomain.fromJSON({
    name: 'mydomain',
    roles
});

SecurityDomain.Store.update(domain);
setDomain('mydomain');

User.Store.update(User.fromJSON(
	{
		name: 'guest_user', 
		email:'me@my.net', 
		domainRoles: [
			[ 'mydomain', [ 'guest' ]]
		]
	}
));

describe('Request filter', () => {

	before(function() {
    	return start();
  	});

  	after(function() {
    	return stop();
  	});

  	it('guest user has guest role', (done) => {
  		User.Store.find('guest_user')
  			.then(user=> {
  				debug(JSON.stringify(user));
  				expect(user.domainRoles.get('mydomain')).to.exist;
  			})
  			.then(()=>done(), done);
  	});

    it('guest user can read blog', (done) => {
    	setUser('guest_user');
        chai.request(app)
            .get('/dev/blog/34')
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(200); done(); 
            })
    });

    it('guest user can\'t write blog', (done) => {
      setUser('guest_user');
        chai.request(app)
            .put('/dev/blog/34')
            .end((err,res) => { 
              expect(res).to.have.status(403); done(); 
            })
    });
});