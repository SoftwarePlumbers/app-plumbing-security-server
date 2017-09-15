const { User, Role, SecurityDomain } = require('../src/model.js');
const chaiHttp = require('chai-http');
const debug = require('debug')('app-plumbing-security-server');
const chai = require('chai');
const { app, start, stop, setUser, setDomain } = require('./server');

const expect= chai.expect;
chai.use(chaiHttp);

const roles = [
    { name: "editor", resources: [ 'dev/blog' ], actions: ['PUT', 'POST', 'DELETE', 'GET', 'PATCH']},
    { name: "contributor", resources: ['dev/blog'], actions: ['PUT', 'POST', 'GET']},
    { name: "guest", resources: ['dev'], actions: ['GET']},
    { name: "guest", resources: ['dev/blog/*/comment'], actions: ['GET','POST']},
    { name: "wiki", resources: ['dev/wiki','prod/wiki'], actions: ['PUT', 'POST', 'DELETE', 'GET']},
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

User.Store.update(User.fromJSON(
  {
    name: 'editor_user', 
    email:'me@my.net', 
    domainRoles: [
      [ 'mydomain', [ 'editor', 'wiki' ]]
    ]
  }
));

describe('Request filter - with test blog/wiki domain', () => {

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

    it('guest user can post comments on blog', (done) => {
      setUser('guest_user');
        chai.request(app)
            .post('/dev/blog/34/comment')
            .field('test','data')
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(200); done(); 
            })
    });

    it('guest user can read dev wiki', (done) => {
      setUser('guest_user');
        chai.request(app)
            .get('/dev/wiki/page')
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(200); done(); 
            })
    });

    it('guest user can\'t read prod wiki', (done) => {
      setUser('guest_user');
        chai.request(app)
            .get('/prod/wiki/page')
            .end((err,res) => { 
              expect(res).to.have.status(403); done(); 
            })
    });

    it('editor user can write to blog', (done) => {
      setUser('editor_user');
        chai.request(app)
            .put('/dev/blog/34')
            .send({test: 'data'})
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(204); done(); 
            })
    });

    it('editor user can write to blog', (done) => {
      setUser('editor_user');
        chai.request(app)
            .put('/dev/blog/34')
            .send({test: 'data'})
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(204); done(); 
            })
    });


    it('editor user can write to prod wiki', (done) => {
      setUser('editor_user');
        chai.request(app)
            .put('/prod/wiki/mypage')
            .send({test: 'data'})
            .end((err,res) => { 
              if (err) debug(err);
              expect(res).to.have.status(204); done(); 
            })
    });

});