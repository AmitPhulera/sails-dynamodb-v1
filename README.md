# sails-dynamodb-v1

Provides easy access to `dynamodb-v1` from Sails.js & Waterline.

This module is a Sails/Waterline community adapter. Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with the dynamodb-v1 database/service.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.

## Installation

To install this adapter, run:

```sh
$ npm install sails-dynamodb-v1
```

## Configuring Models

SailsJS creates an archive models by default, it is recommended that you disable it by setting 'archiveModelIdentity' property to false in config/models.js

And sails appends three default keys as id, createdAt and updatedAt in each and every model you define. If you want to disable those fields they can be removed from 'attributes' key in config/models.js

### Types

Since sails from version 1 supports only 4 types i.e string,number,json and boolean, so to accomodate all the types we have to use combination of columnType key and type key in models to set attribute's type.
Below is the mapping of dynamo's attribute to the adaptor's types

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

Since sails do not allow any attributes other than that are hardcoded in waterline so there was no possibility to add keys which would differentiate the indexes.
But on little bit digging I found description key which was of not that much use. So description was used to specify the indexes.

| Dynamo Index             | Sails Model                      |
| :----------------------- | :------------------------------- |
| Hash Key                 | description = 'hash'             |
| Range Key                | description = 'range'            |
| Secondary Index          | description = 'local-secondary'        |
| Global Secondary Index | description = 'global-secondary' |

**Global secondary indexes can have a hash key and range key of their own so the attribute on which you will add description as 'global-secondary' will be considered as hash key and you can specify it's range key in description only after ##**

Default index names will be
`${hashAttribute}_${columnName}_local_index`

For example

```
// In model file Users.js
module.exports = {
    attributes:{
        userid:{
            type:'string'
            description:'hash'
        },
        gender:{
            type:'string
        },
        country:{
            type:'string',
            description:'global-secondary##gender'
        },
    }

}
```
- In Users.js userid will be the hash key.
- A global secondary index will be created with hash key as country and it's range key as gender.


- create uses normal put whereas createEach uses batchPut.
- Keys that are not specified i.e either are '' or undefined will be filtered out while creating. 

Then [connect the adapter](https://sailsjs.com/documentation/reference/configuration/sails-config-datastores) to one or more of your app's datastores.

- AWS DynamoDB Credentials are required to access the table, so in config/datastores.js configure following keys
```
{
    adapter: 'dynamodb-v1',
    accessKeyId: 'ACCESS_KEY',
    secretAccessKey: 'SECRET_KEY',
    region: 'REGION',
}
```
## Usage

Visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice.

## Questions?

See [Extending Sails > Adapters > Custom Adapters](https://sailsjs.com/documentation/concepts/extending-sails/adapters/custom-adapters) in the [Sails documentation](https://sailsjs.com/documentation), or check out [recommended support options](https://sailsjs.com/support).

<a href="https://sailsjs.com" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>

## Compatibility

This adapter implements the following methods:

| Method            | Status            | Category  |
| :---------------- | :---------------- | :-------- |
| registerDatastore | __done__ | LIFECYCLE |
| teardown          | __done__ | LIFECYCLE |
| create            | __in progress__           | DML       |
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

## License

This dynamodb-v1 adapter is available under the **MIT license**.

As for [Waterline](http://waterlinejs.org) and the [Sails framework](https://sailsjs.com)? They're free and open-source under the [MIT License](https://sailsjs.com/license).

![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)
