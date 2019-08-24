/**
 * @module utils
 * @description Helper functions for the app.js
 */

const DYNAMO_TYPES = {
  string: 'S',
  number: 'N',
  json: 'M',
  map: 'M',
  array: 'L',
  list:'L',
  stringSet: 'SS',
  numberSet: 'NS',
  boolean: 'BOOL',
  binary: 'B'
};
module.exports = {
  /**
   * @function utils.diff
   * @param {Array} A
   * @param {Array} B
   * @return {Array} difference of sets A and B i.e A-B
   */
  diff: (A, B) => {
    if (!Array.isArray(A) || !Array.isArray(B)) {
      throw Error({ err: 'Array or Set expected as input in diff' });
    }
    const s = new Set(...B);
    return A.filter(x => !s.has(x));
  },
  // LocalSecondary Index ka array banega
  // [{
  //    IndexName: hashkey+this.columnName
  //
  // }]
  /**
   * @function utils.getDynamoProperties
   * @param {Object} sailsSchema schema object for all the datastores configured
   * @param {string} table name of the table
   * @return {Object}
   * @description Extracts the properties from sails schema that are required to create dynamo table like tablename,
   * hashKey,rangeKey,secondaryKey
   */
  getDynamoProperties: (sailsSchema, table) => {
    const schema = sailsSchema[table];
    const { definition, tableName } = schema;
    let hashAttribute;
    let rangeAttribute;

    let attributes = Object.keys(definition).map(column => {
      const columnInfo = definition[column];
      let { columnName, type, description} = columnInfo;
      let columnType = columnInfo.autoMigrations.columnType;
      if (type === 'json') {
        type = columnType || 'json';
      }
      if (type === 'string' && columnType === 'binary') {
        type = columnType;
      }
      let attributeObj = { columnName, type };
      if(!description){
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
  prepareCreateQuery: tableInfo => {
    const { hashAttribute, attributes, tableName } = tableInfo;
    const TableName = tableName;
    const KeySchema = [];
    const LocalSecondaryIndexes = [];
    const GlobalSecondaryIndexes = [];
    if (!hashAttribute)
    {throw Error({ err: `Table ${tableName} must have atleast hash key` });}
    const AttributeDefinitions = attributes.map(attr => {
      let { KeyType, type, columnName, rangeKey } = attr;
      switch (KeyType) {
        case 'HASH': {
          KeySchema.push({
            AttributeName: columnName,
            KeyType: 'HASH'
          });
          break;
        }
        case 'RANGE': {
          KeySchema.push({
            AttributeName: columnName,
            KeyType: 'RANGE'
          });
          break;
        }
        case 'LocalSecondary': {
          LocalSecondaryIndexes.push({
            IndexName: `${hashAttribute}_${columnName}_local_index`,
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
          break;
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
              }
            });
          }else{
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
              }
            });
          }
          break;
        }
        default:{
          break;
        }
      };
      if(!DYNAMO_TYPES[type])
        console.log(type);
      const dAttr = {
        AttributeName: columnName,
        AttributeType: DYNAMO_TYPES[type]
      };
      return dAttr;
    });
    let schemaObj = {
      TableName,
      AttributeDefinitions,
      KeySchema
    };
    if (LocalSecondaryIndexes.length !== 0) {
      schemaObj.LocalSecondaryIndexes = LocalSecondaryIndexes;
    }
    if (GlobalSecondaryIndexes.length !== 0) {
      schemaObj.GlobalSecondaryIndexes = GlobalSecondaryIndexes;
    }
    return schemaObj;
  }
};
