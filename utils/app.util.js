/**
 * @module utils
 * @description Helper functions for the app.js
 */
const AWS = require('aws-sdk');
const client = new AWS.DynamoDB.DocumentClient();
const DYNAMO_TYPES = {
  string: 'S',
  number: 'N',
  json: 'M',
  map: 'M',
  array: 'L',
  list: 'L',
  stringSet: 'SS',
  numberSet: 'NS',
  boolean: 'BOOL',
  binary: 'B'
};

const OPERATOR_MAP = {
  '=': 'EQ',
  '!=': 'NE',
  in: 'IN',
  '<=': 'LE',
  '<': 'LT',
  '>=': 'GE',
  '>': 'GT',
  between: 'BETWEEN',
  contains: 'CONTAINS',
  nin: 'NOT_CONTAINS',
  startsWith: 'BEGINS_WITH'
};
//special case for not null and null

module.exports = {
  /**
   * @function utils.diff
   * @param {Array} A
   * @param {Array} B
   * @return {Array} difference of sets A and B i.e A-B
   */
  diff: (A, B) => {
    if (!Array.isArray(A) || !Array.isArray(B)) {
      throw Error({ err: 'Array expected' });
    }
    const s = new Set(B);
    let res = A.filter(x => !s.has(x));
    return res;
  },
  /**
   * @function utils.getDynamoConfig
   * @param {Object} sailsSchema schema object for all the datastores configured
   * @param {string} table name of the table
   * @description Extracts the properties from sails schema that are required to create dynamo table like tablename,
   * hashKey,rangeKey,secondaryKey
   * @return {Object}
   */
  getDynamoConfig: (sailsSchema, table) => {
    const schema = sailsSchema[table];
    const { definition, tableName } = schema;
    let hashAttribute;
    let rangeAttribute;

    let attributes = Object.keys(definition).map(column => {
      const columnInfo = definition[column];
      let { columnName, type, description } = columnInfo;
      let columnType = columnInfo.autoMigrations.columnType;
      if (type === 'json') {
        type = columnType || 'json';
      }
      if (type === 'string' && columnType === 'binary') {
        type = columnType;
      }
      type = DYNAMO_TYPES[type];
      let attributeObj = { columnName, type };
      if (!description) {
        return attributeObj;
      }
      if (description === 'hash') {
        attributeObj.KeyType = 'HASH';
        hashAttribute = columnName;
      } else if (description === 'range') {
        attributeObj.KeyType = 'RANGE';
        rangeAttribute = columnName;
      } else if (description === 'local-secondary') {
        attributeObj.KeyType = 'LocalSecondary';
      } else if (description.split('##')[0] === 'global-secondary') {
        attributeObj.KeyType = 'GlobalSecondary';
        let rangeKey = description.split('##')[1];
        // TODO: add custom index names
        // let indexName = description.split('##')[2];
        if (typeof rangeKey !== 'undefined') {
          attributeObj.rangeKey = rangeKey;
        }
      }
      return attributeObj;
    });
    return { tableName, attributes, rangeAttribute, hashAttribute };
  },
  /**
   * @function utils.prepareCreateQuery
   * @param {Object}tableInfo An object containing all the information required to create a table in dynamoDB.
   * It is basically output of utils.getDynamoProperties.
   * @description returns an object which is adequate to be passed to dynamo's createtable function.
   * @returns {Object}
   */
  prepareCreateTableQuery: tableInfo => {
    const { hashAttribute, attributes, tableName } = tableInfo;
    const TableName = tableName;
    const KeySchema = [];
    const LocalSecondaryIndexes = [];
    const GlobalSecondaryIndexes = [];
    let lSRangeKeys = [];
    if (!hashAttribute) {
      throw Error({ err: `Table ${tableName} must have atleast hash key` });
    }
    const AttributeDefinitions = attributes
      .map(createDynamoDefinitions)
      .filter(Boolean);
    if (lSRangeKeys.length >= 1 ) {
      // Due to the format in which we are specifying global secondary index, we have to check afterwards if the range
      // key provided in index definition is already in AttributeDefinition array, if not add it to the array.
      attributes.map(attr => {
        if (lSRangeKeys.indexOf(attr.columnName) !== -1 &&
        !AttributeDefinitions.find(({AttributeName}) =>
          AttributeName === attr.columnName
        )) {
          let { type, columnName } = attr;
          AttributeDefinitions.push({
            AttributeName: columnName,
            AttributeType: type
          });
        }
      });
    }
    let schemaObj = {
      TableName,
      AttributeDefinitions,
      KeySchema,
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    };
    if (LocalSecondaryIndexes.length !== 0) {
      schemaObj.LocalSecondaryIndexes = LocalSecondaryIndexes;
    }
    if (GlobalSecondaryIndexes.length !== 0) {
      schemaObj.GlobalSecondaryIndexes = GlobalSecondaryIndexes;
    }
    return schemaObj;

    /** helper functions */
    function createDynamoDefinitions(attr) {
      let { KeyType, type, columnName, rangeKey } = attr;
      const dynaomoAttr = {
        AttributeName: columnName,
        AttributeType: type
      };
      if (rangeKey) {
        lSRangeKeys.push(rangeKey);
      }
      switch (KeyType) {
        case 'HASH': {
          KeySchema.push({
            AttributeName: columnName,
            KeyType: 'HASH'
          });
          return dynaomoAttr;
        }
        case 'RANGE': {
          KeySchema.push({
            AttributeName: columnName,
            KeyType: 'RANGE'
          });
          return dynaomoAttr;
        }
        case 'LocalSecondary': {
          LocalSecondaryIndexes.push({
            IndexName: `${columnName}_local_index`,
            KeySchema: [
              {
                AttributeName: hashAttribute,
                KeyType: 'HASH'
              },
              {
                AttributeName: columnName,
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'ALL'
            }
          });
          return dynaomoAttr;
        }
        case 'GlobalSecondary': {
          if (rangeKey) {
            GlobalSecondaryIndexes.push({
              IndexName: `${columnName}_${rangeKey}_global_index`,
              KeySchema: [
                {
                  AttributeName: columnName,
                  KeyType: 'HASH'
                },
                {
                  AttributeName: rangeKey,
                  KeyType: 'RANGE'
                }
              ],
              Projection: {
                ProjectionType: 'ALL'
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            });
          } else {
            GlobalSecondaryIndexes.push({
              IndexName: `${columnName}_global_index`,
              KeySchema: [
                {
                  AttributeName: columnName,
                  KeyType: 'HASH'
                }
              ],
              Projection: {
                ProjectionType: 'ALL'
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1 /* required */,
                WriteCapacityUnits: 1 /* required */
              }
            });
          }
          return dynaomoAttr;
        }
        default: {
          return undefined;
        }
      }
    }
  },
  /**
   * @function utils.populateDataStore
   * @param {Object} dataStore Sails adapter data store object which will be populated
   * @param {Object} schema schema of the table as defined in models
   * @description Populates the registeredDataStores global variable present
   */
  populateDataStore: (dataStore, schema) => {
    let { tableName, attributes } = schema;
    dataStore[tableName] = {};
    let tableConfig = dataStore[tableName];
    attributes.forEach(element => {
      const { type, KeyType, rangeKey, columnName } = element;
      tableConfig[columnName] = { type, KeyType, rangeKey };
    });
    return schema;
  },
  /**
   * @function util.createDynaoItems
   * @param {object} record
   * @param {schema} schema
   * @description Removes empty values and undefined values from the
   * record object and call createSet function for datatypes Number Set
   * and String Set.
   */
  createDynamoItem: (record, schema) => {
    const Item = {};
    for (const attribute in record) {
      const { type } = schema[attribute];
      const value = record[attribute];
      if (value !== '' && value !== undefined) {
        Item[attribute] = value;
      }
      if (type === 'SS' || type === 'NS') {
        Item[attribute] = client.createSet(value);
      }
    }
    return Item;
  },
  /**
   * @function utils.createBatch
   * @param {Array} Items
   * @description for a given array of dynamo records returns a
   * array of batched records where each batch has 15 records.
   */
  createBatch: function(Items) {
    const batchedItems = [];
    let batchArr = [];
    for (let i = 1; i <= Items.length; i++) {
      const Item = Items[i - 1];
      if (i % 15 === 0 || i === Items.length) {
        batchedItems.push(batchArr);
        batchArr = [];
      }
      batchArr.push({
        PutRequest: {
          Item
        }
      });
    }
    return batchedItems;
  },
  /**
   * @param obj
   * @description deep clones the JSON object
   *
   */
  deepClone: obj => JSON.parse(JSON.stringify(obj)),
  /**
   * @param {object} Item Json key value pairs
   * @description converts the json key value pairs to dynamo query object
   */
  createUpdateObject: Item => {
    const AttributeUpdates = {};
    Object.keys(Item).map(key => {
      const val = Item[key];
      AttributeUpdates[key] = {
        Action: 'PUT',
        Value: val
      };
    });
    return AttributeUpdates;
  },
  /**
   *
   * @param {Object} schema
   * @param {Object} query
   * @description Figures out type of query to perform with given qeury object
   * and shcema information
   */
  getIndexes: function(schema, query) {
    let queryNature = {};
    let { indexInfo, filterKeys } = this.extractIndexFields(query, schema);

    if (indexInfo.hash && indexInfo.range) {
      queryNature.type = 'query';
      queryNature.keys = {
        hash: indexInfo.hash,
        range: indexInfo.range
      };
    } else if (indexInfo.hash && indexInfo.localS) {
      queryNature.type = 'localIndex';
      queryNature.keys = {
        hash: indexInfo.hash,
        secondary: indexInfo.localS
      };
    } else if (indexInfo.globalS) {
      queryNature.type = 'globalIndex';
      queryNature.keys = {
        hash: indexInfo.globalS
      };
      let { rangeKey } = schema[indexInfo.globalS];
      if (rangeKey && query[rangeKey]) {
        queryNature.keys.range = rangeKey;
      }
    } else if (indexInfo.hash) {
      queryNature.type = 'query';
      queryNature.keys = {
        hash: indexInfo.hash
      };
    } else {
      queryNature.type = 'scan';
      queryNature.keys = {};
    }
    if (queryNature.type === 'globalIndex' && queryNature.keys.range) {
      filterKeys = filterKeys.filter(e => e !== queryNature.keys.range);
    }
    queryNature.filterKeys = filterKeys;
    return queryNature;
  },
  /**
   *
   * @param {object} query
   * @param {object} schema
   * @description returns a map which contains the index type
   * to set as attribute names if present in query else are set
   * as false.
   */
  extractIndexFields: function(query, schema) {
    let indexInfo = {
      hash: false,
      range: false,
      localS: false,
      globalS: false
    };
    let filterKeys = [];
    Object.keys(query).forEach(key => {
      const { KeyType } = schema[key];
      if (KeyType === 'HASH') {
        indexInfo.hash = key;
      } else if (KeyType === 'RANGE') {
        indexInfo.range = key;
      } else if (KeyType === 'LocalSecondary') {
        indexInfo.localS = key;
      } else if (KeyType === 'GlobalSecondary') {
        indexInfo.globalS = key;
      } else {
        filterKeys.push(key);
      }
    });
    return { indexInfo, filterKeys };
  },
  /**
   * @function prepareConditions
   * @param {Object} query A JSON query object
   * @param {Object} indexInfo index info
   * @description given the JSON query function will return
   * Dynamo Query object with key indexes and will add rest
   * keys in filter object.
   */
  prepareQueryConditions(query, indexInfo) {
    // https://sailsjs.com/documentation/concepts/models-and-orm/query-language
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#query-property
    // How to get index name?
    let KeyConditions = {};
    if (Object.keys(indexInfo.keys).length !== 0) {
      let { hash, range } = indexInfo.keys;
      let attributeValue = query[hash];
      KeyConditions[hash] = this.dynamoAttribute(attributeValue);
      if (range) {
        attributeValue = query[range];
        KeyConditions[range] = this.dynamoAttribute(attributeValue);
      }
    }
    let QueryFilter = indexInfo.filterKeys.reduce((qfilter, attr) => {
      let attributeValue = query[attr];
      qfilter[attr] = this.dynamoAttribute(attributeValue);
      return qfilter;
    }, {});
    return { QueryFilter, KeyConditions };
  },
  /**
   * @function dynamoAttribute
   * @param {Object|String} attr
   * @description Converts a attribute of sails query to it's respective dynamoDB query Attribute
   */
  dynamoAttribute: function(attr) {
    let ComparisonOperator = 'EQ';
    let value = attr;
    if (typeof attr === 'object' && attr !== null) {
      //support for multiple operators
      let operator = Object.keys(attr)[0];
      value = attr[operator];
      if (typeof OPERATOR_MAP[operator] === 'undefined') {
        throw Error(`Operator ${operator} not supported by the adapter`);
      }
      ComparisonOperator = OPERATOR_MAP[operator];
    }
    const AttributeValueList = Array.isArray(value) ? value : [value];
    return { AttributeValueList, ComparisonOperator };
  },
  /**
   * @function normarlizeData
   * @param {Objec} entry A dynamoDb record.
   * @param {Object} schema datastore object of the table
   * @description Used for normalizing each entry queried from dynamoDB as in cases of sets the application expects
   * array, So this function translates DynamoSets to js arrays.
   */
  normalizeData: function(entry, schema) {
    Object.keys(entry).forEach(attr => {
      if (schema[attr].type === 'SS' || schema[attr].type === 'NS') {
        entry[attr] = entry[attr].values;
      }
    });
    return entry;
  }
};
