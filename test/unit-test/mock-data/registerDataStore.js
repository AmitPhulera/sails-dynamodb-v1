const datastoreConfig = {
  adapter: 'dejoule_dynamo',
  accessKeyId: 'AKIAIGNICTAFZP5ZXW6Q',
  secretAccessKey: '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',
  region: 'us-west-1',
  identity: 'default'
};

const physicalModelsReport = {
  testdb: {
    primaryKey: 'deviceId',
    definition: {
      data: {
        type: 'json',
        autoMigrations: {
          unique: false,
          autoIncrement: false,
          columnType: '_json'
        },
        columnName: 'data'
      },
      deviceId: {
        type: 'string',
        description: 'hash',
        required: true,
        autoMigrations: {
          unique: true,
          autoIncrement: false,
          columnType: '_stringkey'
        },
        columnName: 'deviceId'
      },
      timestamp: {
        type: 'string',
        description: 'range',
        autoMigrations: {
          unique: false,
          autoIncrement: false,
          columnType: '_string'
        },
        columnName: 'timestamp'
      },
      siteId: {
        type: 'string',
        description: 'range',
        autoMigrations: {
          unique: false,
          autoIncrement: false,
          columnType: '_string'
        },
        columnName: 'siteId'
      }
    },
    tableName: 'datadevices',
    identity: 'datadevices',
    hashKey: 'deviceId',
    rangeKey: 'siteId'
  }
};
module.exports = {
  datastoreConfig,
  physicalModelsReport
};
