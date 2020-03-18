const _ = require('lodash');
const AWS = require('aws-sdk');
const utils = require('../../lib/utils');
const app = require('../../index');
const dummy = require('../../mockData/registerDataStore');
const sinon = require('sinon');
const assert = require('chai').assert;

describe('Test suite for appjs',()=>{
    it('Test app.js',()=>{
        const cb = sinon.spy();
        app.registerDatastore(dummy.datastoreConfig,dummy.physicalModelsReport,cb);
        assert.isTrue(cb.called);
    })
});