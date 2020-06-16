const express = require('express')
const app = express()
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose')
const schemas = require('./schemas')
const StronoMongo = require('./lib/StronoMongo')

mongoose.connection.once('open', ()=>{
    const stronoMongo = new StronoMongo(schemas)

    app.get('/', (req, res)=>{
        res.json({
            message: 'welcome devs'
        })
    })

// Construct a schema, using GraphQL schema language
    const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// Provide resolver functions for your schema fields
    const resolvers = {
        Query: {
            hello: () => 'Hello world!',
        },
    };

    const server = new ApolloServer({
        // typeDefs,
        // resolvers
        schema: stronoMongo.buildSchema()
    });

    server.applyMiddleware({app})

    app.listen(8080, ()=>{
        console.log('server running on port 8080')
    })
})


mongoose.connect('mongodb://localhost/strono_node', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: true
});
