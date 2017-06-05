var test = require('tape');
var Collection = require('../ampersand-collection');
var State = require('ampersand-state');
var Stooge = State.extend({
    props: {
        id: 'string',
        name: 'string'
    }
});

test('basics', function (t) {
    var c = new Collection();
    var obj = {hey: 'there'};
    t.ok(c);
    c.add(obj);
    t.equals(c.length, 1);
    t.equals(c.at(0), obj);
    t.end();
});

test('indexes: should do `id` by default', function (t) {
    var c = new Collection();
    var obj = {id: '47'};
    var obj2 = {id: '48'};
    c.add([obj, obj2]);
    t.equal(c.get('47'), obj);
    t.equal(c.get('48'), obj2);
    t.end();
});

test('indexes: optionally create other indexes', function (t) {
    var C = Collection.extend({indexes: ['id', 'username']});
    var c = new C();
    var larry = {id: 1, username: 'larry'};
    var curly = {id: 2, username: 'curly'};
    var moe = {id: 3, username: 'moe'};
    c.add([larry, curly, moe]);

    t.equal(larry, c.get('larry', 'username'));
    t.equal(larry, c.get(1));
    t.equal(curly, c.get('curly', 'username'));
    t.equal(curly, c.get(2));
    t.equal(moe, c.get('moe', 'username'));
    t.equal(moe, c.get(3));
    t.end();
});

test('indexes: permit indexing on derived', function (t) {
    var MyState = State.extend({
        props: { myid: 'number' },
        derived: {
            derivedProp: {
                deps: ['myid'],
                fn: function() { return this.myid + '_derived'; }
            }
        }
    });
    var MyCol = Collection.extend({
        mainIndex: 'derivedProp',
        model: MyState
    });
    var c = new MyCol();
    var obj = {myid: 1};
    var obj2 = {myid: 2};
    var obj3 = {myid: 2}; // intentional duplicate
    c.add([obj, obj2, obj3]);
    t.equal(c.length, 2, 'honors derived index');
    t.end();
});

test('models: support for model constructors', function (t) {
    var Model = function (attributes) {
        this.attributes = attributes;
    };
    var C = Collection.extend({
        model: Model
    });
    var m = new Model({name: 'moe'});
    var plain = {name: 'moe'};
    var c = new C();
    c.add([plain, m]);
    t.equal(m, c.at(1));
    t.ok(c.at(0) instanceof Model);
    t.ok(c.at(1) instanceof Model);
    t.notEqual(plain, c.at(0));
    t.end();
});

test('extend: multi-extend for easy mixins', function (t) {
    var hey = {hey: function () { return 'hey'; }};
    var hi = {hi: function () { return 'hi'; }};
    var C = Collection.extend(hey, hi);
    var c = new C();
    t.equal(c.hey(), 'hey');
    t.equal(c.hi(), 'hi');
    var C2 = C.extend({woah: function () { return 'woah'; }});
    var c2 = new C2();
    t.equal(c2.woah(), 'woah');
    t.end();
});

test('add events', function (t) {
    t.plan(2);
    var c = new Collection();
    var moe = new Stooge({name: 'moe'});
    c.on('add', function (model, collection) {
        t.equal(collection, c);
        t.equal(model, moe);
    });
    c.add(moe);
    t.end();
});

test('remove events', function (t) {
    t.plan(2);
    var c = new Collection();
    var moe = new Stooge({name: 'moe', id: 'thing'});
    c.add(moe);
    c.on('remove', function (model, collection) {
        t.equal(collection, c);
        t.equal(model, moe);
    });
    c.remove(moe);
    t.end();
});

test('remove events for items that only have `cid`s', function (t) {
    t.plan(2);
    var c = new Collection();
    var moe = new Stooge({name: 'moe'});
    c.add(moe);
    c.on('remove', function (model, collection) {
        t.equal(collection, c);
        t.equal(model, moe);
    });
    c.remove(moe);
    t.end();
});

test('comparator as a string', function (t) {
    var Coll = Collection.extend({
        comparator: 'name'
    });
    var c = new Coll();
    var moe = new Stooge({name: 'moe', id: '1'});
    var larry = new Stooge({name: 'larry', id: '2'});
    var curly = new Stooge({name: 'curly', id: '3'});
    c.add([moe, curly, larry]);
    t.equal(c.at(0).name, 'curly');
    t.equal(c.at(1).name, 'larry');
    t.equal(c.at(2).name, 'moe');
    t.end();
});

test('comparator as a 1 arg function', function (t) {
    var Coll = Collection.extend({
        comparator: function (m) {
            return m.name;
        }
    });
    var c = new Coll();
    var moe = new Stooge({name: 'moe', id: '1'});
    var larry = new Stooge({name: 'larry', id: '2'});
    var curly = new Stooge({name: 'curly', id: '3'});
    c.add([moe, curly, larry]);
    t.equal(c.at(0).name, 'curly');
    t.equal(c.at(1).name, 'larry');
    t.equal(c.at(2).name, 'moe');
    t.end();
});

test('comparator as standard 2 arg sort function', function (t) {
    var Coll = Collection.extend({
        comparator: function (m1, m2) {
            if (m1.name > m2.name) return 1;
            if (m1.name < m2.name) return -1;
            return 0;
        }
    });
    var c = new Coll();
    var moe = new Stooge({name: 'moe', id: '1'});
    var larry = new Stooge({name: 'larry', id: '2'});
    var curly = new Stooge({name: 'curly', id: '3'});
    c.add([moe, curly, larry]);
    t.equal(c.at(0).name, 'curly');
    t.equal(c.at(1).name, 'larry');
    t.equal(c.at(2).name, 'moe');
    t.end();
});

test('comparator as 2 arg has ref to "this"', function(t){
    var boundCollection;
    var Coll = Collection.extend({
        comparator: function (m1, m2) {
            boundCollection = this;
            return 0;
        }
    });
    var c = new Coll();
    var moe = new Stooge({name: 'moe', id: '1'});
    var larry = new Stooge({name: 'larry', id: '2'});
    c.add([moe, larry]);
    t.equal(c,boundCollection);
    t.end();
});

test('should store reference to parent instance if passed', function (t) {
    var parent = {};
    var c = new Collection([], {parent: parent});
    t.equal(c.parent, parent);
    t.end();
});

test('`set` should remove models that aren\'t there', function (t) {
    var c = new Collection();
    c.model = Stooge;
    c.set([{name: 'moe', id: '1'}, {name: 'larry', id: '2'}, {name: 'curly', id: '3'}]);
    t.equal(c.length, 3, 'should have 3 stooges');
    c.set([{name: 'moe', id: '1'}, {name: 'larry', id: '2'}]);
    t.equal(c.length, 2, 'should have 2 stooges left');
    t.end();
});

test('`set` method should work for simple objects too', function (t) {
    var c = new Collection();
    c.set([{id: 'thing'}, {id: 'other'}]);
    t.equal(c.length, 2, 'should have two items');
    c.set([{id: 'thing', other: 'property'}], {remove: true});
    t.equal(c.length, 1, 'should have one item');
    var first = c.at(0);
    t.equal(first.id, 'thing');
    t.equal(first.other, 'property');
    t.end();
});

test('`set` method should work for simple objects without ids', function (t) {
    var c = new Collection();
    c.set([{some: 'thing'}, {random: 'other'}]);
    t.equal(c.length, 2, 'should have two items');
    c.set([{other: 'third'}], {remove: false});
    t.equal(c.length, 3);
    var first = c.at(0);
    t.equal(first.some, 'thing');
    t.end();
});

test('Proxy `Array.prototype` methods', function (t) {
    var c = new Collection();
    c.set([{id: 'thing'}, {id: 'other'}]);
    var ids = c.map(function (item) {
        return item.id;
    });
    t.deepEqual(ids, ['thing', 'other']);

    var count = 0;
    c.each(function () {
        count++;
    });
    t.equal(count, 2);
    c.forEach(function () {
        count++;
    });
    t.equal(count, 4);
    t.end();
});

test('Serialize/toJSON method', function (t) {
    var c = new Collection();
    c.set([{id: 'thing'}, {id: 'other'}]);
    t.deepEqual([{id: 'thing'}, {id: 'other'}], c.serialize());
    t.equal(JSON.stringify([{id: 'thing'}, {id: 'other'}]), JSON.stringify(c));
    t.end();
});

test('Ensure `isCollection` exists and is immutable', function (t) {
    var c = new Collection();
    t.ok(c.isCollection);
    try {
      c.isCollection = false;
    } catch (e) {
      //It's ok if this throws, the property only has a setter
      //and some browsers (i.e. phantomjs) error on this
    }
    t.ok(c.isCollection);
    t.end();
});

test('add/remove events should be triggerd with POJO collections', function (t) {
    t.plan(4);

    var c = new Collection();
    var newModel = { id: 1, foo: 'bar' };

    c.once('add', function (model, collection, options) {
        t.equal(model, newModel);
        t.equal(collection, c);
    });

    c.add(newModel);

    c.once('remove', function (model, collection, options) {
        t.equal(model.id, 1);
        t.equal(collection, c);
    });

    c.remove(newModel);
});

test('Bug 14. Should prevent duplicate items when using non-standard idAttribute', function (t) {
    var Model = State.extend({
        idAttribute: '_id',
        props: {
            _id: 'string'
        }
    });

    var C = Collection.extend({
        mainIndex: '_id',
        model: Model
    });
    var c = new C([{_id: '2'}, {_id: '2'}, {_id: '2'}]);

    t.equal(c.length, 1, 'should still be 1');
    c.add({_id: '2'});
    t.equal(c.length, 1, 'should still be 1 if added later');
    c.add(new Model({_id: '2'}));
    t.equal(c.length, 1, 'should still be 1 if added as an instantiated model');
    t.end();
});

test('Should prevent duplicate items when using non-standard mainIndex without model', function (t) {
    var C = Collection.extend({
        mainIndex: '_id'
    });
    var c = new C([{_id: '2'}, {_id: '2'}, {_id: '2'}]);

    t.equal(c.length, 1, 'should still be 1');
    c.add({_id: '2'});
    t.equal(c.length, 1, 'should still be 1 if added later');
    t.end();
});

test('Bug 20. Should prevent duplicate items when using non-standard idAttribute', function (t) {
    var data = [{_id: '2'}];
    var Model = State.extend({
        idAttribute: '_id',
        props: {
            _id: 'string'
        }
    });
    var C = Collection.extend({
        model: Model
    });
    var c = new C();

    c.reset(data);
    c.add(data);
    t.equal(c.length, 1, 'should have detected the dupe and not added');
    t.end();
});

test('Bug 19. Should set mainIndex from model if supplied', function (t) {
    var Model = State.extend({
        idAttribute: '_id',
        props: {
            _id: 'string'
        }
    });
    var C = Collection.extend({
        model: Model
    });

    var c = new C();
    t.equal(c.mainIndex, '_id', 'should have set mainIndex off of model');

    var c2 = new Collection();
    t.equal(c2.mainIndex, 'id', 'mainIndex should default to `id`');

    t.end();
});

test('add with validate:true enforces validation', function (t) {
    t.plan(5);

    var Model = State.extend({
        idAttribute: '_id',
        props: {
            _id: 'string'
        },
        validate: function (attributes) {
            return 'fail';
        }
    });
    var C = Collection.extend({
        model: Model
    });

    var c = new C();

    c.on('invalid', function (collection, error, options) {
        t.equal(c, collection);
        t.equal(error, 'fail');
        t.equal(options.validate, true);
    });

    var result = c.add({_id: 'a'}, {validate: true});
    t.equal(c.length, 0);
    t.equal(result, false);

    t.end();
});

test('get can be used with cid value or cid obj', function (t) {
    t.plan(2);

    var C = Collection.extend({
        model: State.extend({
            props: {
                id: 'number'
            }
        })
    });
    var collection = new C([{id: 1}, {id: 2}, {id: 3}]);
    var first = collection.at(0);

    t.equal(1, collection.get(first.cid).id);
    t.equal(1, collection.get({cid: first.cid}).id);

    t.end();
});

test('should not leak indexes between collections when indexes is undefined', function (t) {
    var data = [{id: 4, name: 'me'}];
    var C = Collection.extend({
        mainIndex: 'id'
    });

    var D = Collection.extend({
        mainIndex: 'name'
    });
    var c = new C();
    var d = new D();

    c.reset(data);
    d.reset(data);

    t.ok(c.get(4), 'should get by mainIndex');
    t.ok(d.get('me'), 'should get by mainIndex');
    t.notOk(c.get('me', 'name'), 'should be undefined for invalid index');
    t.notOk(d.get(4, 'me'), 'should throw an error for invalid index');
    t.equal(d.get('me'), d.at(0), 'should get the same model by different indexes');
    t.end();
});

test('should be able to get/remove a model with an idAttribute of 0', function (t) {
    var C = Collection.extend({
        mainIndex: 'id',
        indexes: ['username']
    });
    var c = new C();
    var moe = {id: 0, username: 'moe'};
    var curly = {id: 1, username: 'curly'};
    c.add([moe, curly]);

    t.ok(c.get(1), 'should get by id:1');
    t.ok(c.get('curly', 'username'), 'should get by secondary index');
    t.ok(c.get('moe', 'username'), 'should get by secondary index');
    t.ok(c._indexes.id[0], 'should get by id:0');
    t.ok(c.get(0, 'id'), 'should get by id:0');
    t.ok(c.get(0), 'should get by id:0');
    t.equal(moe, c.get(0));

    c.remove(0);
    t.notOk(c.get(0), 'should remove by id:0');

    t.end();
});

test('should check for existing by mainIndex and not model.idAttribute', function (t) {
    var C = Collection.extend({
        mainIndex: 'name',
        model: Stooge
    });
    var c = new C();
    var moe = new Stooge({id: '0', name: 'moe'});
    var curly = {id: '1', name: 'curly'};
    c.add([moe, curly]);

    t.notEqual(c.mainIndex, moe.idAttribute, 'mainIndex can be different than idAttribute');
    t.equal(moe.idAttribute, 'id', 'default model attribute should be id');
    t.equal(moe.getId(), '0', 'default model attribute should be id');
    t.ok(c.get('curly'), 'should get model using mainIndex');
    t.equal(c.get('moe'), moe, 'should get same model using mainIndex');

    t.equal(c.length, 2, 'should be only 2 models');
    c.add(curly);
    t.equal(c.length, 2, 'should not add duplicate');
    c.remove(moe);
    t.equal(c.length, 1, 'should be able to remove model');
    c.remove(curly);
    t.equal(c.length, 0, 'should be able to remove model by property');
    t.end();
});

test('Bug 45. Should update indexes if an indexed attribute of a model change', function (t) {
    t.plan(9);

    var C = Collection.extend({
        model: Stooge,
        indexes: ['name']
    });

    var model = new Stooge({id: '1', name: 'moe'});
    var collection = new C(model);

    t.equal('1', collection.get('1').id, 'should find model with mainindex');
    t.equal('1', collection.get('moe', 'name').id, 'should find model with other index');

    model.id = '2';
    t.equal('2', collection.get('2').id, 'should find model with new value of mainIndex');
    t.equal(undefined, collection.get('1'), 'should not find model with old value of mainIndex');

    model.name = 'larry';
    t.equal('2', collection.get('larry', 'name').id, 'should find model with new value of other index');
    t.equal(undefined, collection.get('moe', 'name'), 'should not find model with old value of other index');

    model.unset('name');
    t.equal('2', collection.get('2').id, 'should find model with mainIndex after unset other index');
    t.equal(undefined, collection.get('moe', 'name'), 'should not find model with old value of other index after unset this attribute');

    model.name = 'curly';
    t.equal('2', collection.get('curly', 'name').id, 'should find model with new value of other index after unset/set');
    t.end();
});

test('Collection should rethrow change events on a model', function (t) {
    t.plan(2);
    var C = Collection.extend({
        model: Stooge,
        indexes: ['name']
    });

    var model = new Stooge({id: '1', name: 'moe'});
    var collection = new C(model);

    collection.on('change:name', function (m, newName) {
        t.equal(m, model);
        t.equal(newName, 'shmoe');
    });

    model.name = 'shmoe';
});

test('indexes: should reindex on a `set` of a model with same index secondary index value (#84)', function (t) {
    var FooCollection = Collection.extend({
        indexes: ['foo', 'see']
    });

    var obj = {id: '47', foo: 'bar', see: 'saw'};
    var obj2 = {id: '48', foo: 'bar', see: 'food'};
    var obj3 = {id: '49', foo: 'far', see: 'saw'};

    var c = new FooCollection([obj]);

    t.equal(c.get('bar', 'foo'), obj);

    c.set([obj2, obj3]);

    t.equal(c.get('bar', 'foo'), obj2);
    t.equal(c.get('saw', 'see'), obj3);

    t.end();
});
