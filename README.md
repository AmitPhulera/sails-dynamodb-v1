# sails-dynamodb-v1

A waterline based adapter for accessing dynamoDB with SailsJS Version 1+.

## Installation

To install this adapter, run:

```sh
$ npm install sails-dynamodb-v1
```

AWS DynamoDB Credentials are required to access the table, so in config/datastores.js configure following keys
- adapter = 'sails-dynamodb-v1'
- accessKeyId = 'your_access_key'
- secretAccessKey = 'your_secret_key'
- region = 'region of table'

If using default datasore your config/datastores.js should look like.

```js

module.exports.datastores = {
  default: {
    adapter: 'sails-dynamodb-v1',
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    region: REGION,
}
};


```

## Configuring Models

SailsJS creates an archive models by default, it is recommended that you disable it by setting 'archiveModelIdentity' property to false in config/models.js otherwise a table named as archive will be created

And sails appends three default keys as id, createdAt and updatedAt in each and every model you define. If you want to disable those fields they can be removed from 'attributes' key in config/models.js

### Types

Since sails from version 1 supports only 4 types i.e string,number,json and boolean, so to accomodate all the types that are supported by DynamoDB we have to use combination of **columnType** key and **type** key in models to set attribute's type.
Below is the table showing how dynamo's types can be created.

| Dynamo Attribute Type | Sails Model                       |
| :-------------------- | :-------------------------------- |
| String                | type=string                       |
| Number                | type=number                       |
| Map                   | type=json && columnType=map                     |
| List                  | type=json && columnType=array     |
| StringSet             | type=json && columnType=stringSet |
| NumberSet             | type=json && columnType=numberSet |
| Boolean               | type=boolean                      |
| Binary/Buffer         | type=string && columnType=binary                    |

## Defining Indexes

Since sails do not allow any attributes other than those which are hardcoded [here](https://github.com/balderdashy/waterline-schema/blob/master/accessible/valid-attribute-properties.js) in waterline-schema so there was no possibility to add keys which would differentiate the indexes.
But they have a **description** key which was safe to be used for storing user defined values, so this adapter uses **description** field to specify indexes in the models.

Below is the list of how you will specify differnt indexes in the table.

| Dynamo Index             | Sails Model                      |
| :----------------------- | :------------------------------- |
| Hash Key                 | description = 'hash'             |
| Range Key                | description = 'range'            |
| Secondary Index          | description = 'local-secondary'        |
| Global Secondary Index | description = 'global-secondary' |

><hr>
> Please note that primaryKey field must be initialized as your hash key in models file other wise sails will create an addition field **id** in the model which may cause some unexpected behaviour.
>
> Refer to the example below 
><hr>

**Global secondary indexes can have a hash key and range key of their own so the attribute on which you will add description as 'global-secondary' will be considered as hash key and you can specify it's range key in description only after ##**

Default index names will be
`${hashAttribute}_${columnName}_local_index`

For example

```js
// In model file Users.js
module.exports = {
    primaryKey:'userId',
    attributes:{
        userId:{
            type:'string',
            description:'hash'
        },
        gender:{
            type:'string',
        },
        country:{
            type:'string',
            description:'global-secondary##gender'
        },
    }

}
```
In Users.js userid will be the hash key. So we have specified it in primaryKey key.

A global secondary index will be created with hash key as country and it's range key as gender.

## Usage

This adapter implements the following methods:

| Method            | Status            | Category  |
| :---------------- | :---------------- | :-------- |
| registerDatastore | __done__ | LIFECYCLE |
| teardown          | __done__ | LIFECYCLE |
| create            | __done__           | DML       |
| createEach        | __done__           | DML       |
| update            | __done__           | DML       |
| destroy           | __done__           | DML       |
| find              | __done__           | DQL       |
| join              | _**???**_         | DQL       |
| count             | Planned           | DQL       |
| sum               | __NO USE__           | DQL       |
| avg               | __NO USE__           | DQL       |
| define            | __NO USE__           | DDL       |
| drop              | Planned           | DDL       |
| setSequence       | _**???**_         | DDL       |

Things to keep in mind
- Use createEach for multiple entries as it uses batchPut which is much efficient.
- In find() the adapter figures out on it's own to query table or it's indexes or scan the table based on the attributes present in query passed. All the key attributes(attributes used in any of the index or hashkey or range key) will be used to query in the following order


```txt
HashKey+rangekey > HashKey+LSI > GSI > HashKey > Scan
```
 Non key attributes will be passed in FilterKeys.
 
For more details on how to use these functions visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice.




## Questions?

See [Extending Sails > Adapters > Custom Adapters](https://sailsjs.com/documentation/concepts/extending-sails/adapters/custom-adapters) in the [Sails documentation](https://sailsjs.com/documentation), or check out [recommended support options](https://sailsjs.com/support).

<a href="https://sailsjs.com" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>



## License

This dynamodb-v1 adapter is available under the **MIT license**.

As for [Waterline](http://waterlinejs.org) and the [Sails framework](https://sailsjs.com)? They're free and open-source under the [MIT License](https://sailsjs.com/license).
