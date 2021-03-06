const { Role, SecurityDomain } = require('../src/model.js');
const { Store } = require('db-plumbing-map');
const Patch = require('typed-patch');
const debug = require('debug')('app-plumbing-security-server');
const expect = require('chai').expect;

const roles = [
    { name: "editor", resources: [ 'dev/blog' ], actions: ['put', 'post', 'delete', 'get', 'patch']},
    { name: "contributor", resources: ['dev/blog'], actions: ['put', 'post', 'get']},
    { name: "guest", resources: ['dev'], actions: ['get']},
    { name: "guest", resources: ['dev/blog/*/comment'], actions: ['get','post']},
    { name: "wiki", resources: ['dev/wiki','prod/wiki'], actions: ['put', 'post', 'del', 'get']},
]

const domain = SecurityDomain.fromJSON({
    name: 'default',
    roles
});


describe('SecurityDomain', () => {

    it("can get a role from a domain", () => {
      let contributor = domain.roles.find(e=>e.name === 'contributor');
      expect(contributor).to.exist;
    });

    it("splits resource path when converting from JSON", () => {
  		let editor = domain.roles[0];
  		expect(editor.resources).to.have.lengthOf(1);
  		let editor_resource = editor.resources[0];
  		expect(editor_resource).to.have.lengthOf(2);
  		expect(editor_resource[0]).to.equal('dev');
  		expect(editor_resource[1]).to.equal('blog');

  		let guest1 = domain.roles[2];
  		expect(guest1.resources).to.have.lengthOf(1);
  		let guest1_resource = guest1.resources[0];
  		expect(guest1_resource).to.have.lengthOf(1);
  		expect(guest1_resource[0]).to.equal('dev');

  		let guest2 = domain.roles[3];
  		expect(guest2.resources).to.have.lengthOf(1);
  		let guest2_resource = guest2.resources[0];
   		expect(guest2_resource).to.deep.equal(['dev','blog','*','comment']);

  		let wiki = domain.roles[4];
  		expect(wiki.resources).to.have.lengthOf(2);
  		expect(wiki.resources[0]).to.deep.equal(['dev','wiki']);
  		expect(wiki.resources[1]).to.deep.equal(['prod','wiki']);
    });

    it("joins resource path when converting to JSON", () => {
    	let reverse = domain.roles.map(r => r.toJSON()).map(({name,resources,actions})=>({name,resources, actions}));
    	expect(Array.from(reverse)).to.deep.equal(roles);
    });

    it("Calculates roles for resources", () => {
    		let roles;
            roles = domain.getRolesFor('dev/blog/34','get');
    		expect(Array.from(roles)).to.have.members(['editor','contributor','guest']);
    		roles = domain.getRolesFor('dev/blog','delete');
    		expect(Array.from(roles)).to.have.members(['editor']);
    		roles = domain.getRolesFor('prod/wiki','get');
    		expect(Array.from(roles)).to.have.members(['wiki']);
    		roles = domain.getRolesFor('dev/nuts','get');
    		expect(Array.from(roles)).to.have.members(['guest']);
    		roles = domain.getRolesFor('nuts','get');
    		expect(Array.from(roles)).to.be.empty;
    });

    it("Computes patch for role update", () => {
      let cix = domain.roles.findIndex(e=>e.name === 'contributor');
      let actions = domain.roles[cix].actions.push('delete');
      let contributor_role = domain.roles[cix].setActions(actions);
      let roles = domain.roles.set(cix, contributor_role);
      let domain2 = domain.setRoles(roles);
      let patch = Patch.compare(domain, domain2);
      debug('patch: %j', patch);
      let domain3 = patch.patch(domain);
      debug(domain3);
      for (let i = 0; i < 5; i++) {
        let r1 = domain2.roles[i];
        let r2 = domain3.roles[i];
        expect(r1).to.exist;
        expect(r2).to.exist;
        expect(r1.name).to.equal(r2.name);
        expect(r1.actions.length).to.equal(r2.actions.length);
        r1.actions.forEach((action, index) => expect(action).to.equal(r2.actions[index]));
      }
    });
});