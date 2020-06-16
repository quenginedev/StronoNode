const {
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLScalarType,
    GraphQLString,
    GraphQLInt,
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLList,
    GraphQLNonNull,
    GraphQLSchema
} = require('graphql')
const GraphQLDateTime = require('graphql-type-datetime')
const { isArray , isString, isObject } = require('./utils')
const errors = {
    StronoInvalidField : (c, f, i) => {error: `${c} field ${f}: invalid input ${i} provided`}
}

module.exports = class StronoComposer {

    schemas = []
    types = {
        String: GraphQLString,
        Int: GraphQLInt,
        Datetime: GraphQLDateTime,
        Float: GraphQLFloat,
        Boolean: GraphQLBoolean
    }
    inputTypes = {}
    references = {}
    compositions = []

    Query = {}
    Mutation = {}

    constructor(schemas) {
        this.schemas = schemas
        this.normalizeSchemasToCompositions()
    }

    normalizeSchemasToCompositions(){
        this.schemas.forEach(schema=>{
            let composition_name = schema.name
            let composition_field = []
            Object.keys(schema.fields).forEach((field_name)=>{
                let schemaField = schema.fields[field_name]
                let field = {
                    name: field_name,
                    type: '',
                    many: false,
                    required: false,
                    unique: false,
                    link: false
                }
                // Is it an array
                if(isArray(schemaField)){
                    field["many"] = true
                    if (isObject(schemaField[0])){
                        if(isArray(schemaField[0].type)){
                            field.type = schemaField[0].type[0]
                        }else {
                            field.type = schemaField[0].type
                        }
                        field.many = !!schemaField[0].many
                        field.ref = !!schemaField[0].ref
                        field.required = !!schemaField[0].required
                        field.unique = !!schemaField[0].unique
                        field.default = schemaField[0].default



                    }else if(isString(schemaField[0])){
                        field.type = schemaField[0]
                    }else {
                        throw errors.StronoInvalidField(composition_name, field_name, schemaField)
                    }
                }else if (isObject(schemaField)){
                    field.many = !!schemaField.many
                    field.ref = !!schemaField.ref
                    field.required = !!schemaField.required
                    field.unique = !!schemaField.unique
                    field.default = schemaField.default

                    if (isArray(schemaField.type)){
                        field = {...field, ...schemaField}
                        field.many = true
                        field.type = schemaField.type[0]
                    }else{
                        field = {...field, ...schemaField}
                    }
                } else if(isString(schemaField)){
                    field.type = schemaField
                }else{
                    throw errors.StronoInvalidField(composition_name, field_name, schemaField)
                }

                if (field.ref){
                    this.setReference(composition_name, field)
                }

                composition_field.push(field)
            })
            this.compositions.push({
                name: composition_name,
                fields: composition_field
            })
        })
    }

    setReference(composition_name, field){
        if(!this.references[composition_name])
            this.references[composition_name] = []

        this.references[composition_name].push(field)
    }

    getType(type){
        return this.types[type]
    }

    getInputType(type){
        return this.inputTypes[type]
    }


    addType(name, type){
        this.types[name] = type
    }


    addInputType(name, inputType){
        this.inputTypes[name] = inputType
    }



    createScalar(scalar){
        return new GraphQLScalarType({
            name: scalar.name,
            serialize: scalar.serialize,
            parseValue: scalar.parseValue,
            parseLiteral: scalar.parseLiteral
        })
    }

    createObjectType(object) {
        return new GraphQLObjectType({
            name: object.name,
            description: object.description,
            fields: object.fields
        })
    }

    createObjectInputType(object) {
        return new GraphQLInputObjectType({
            name: object.name,
            description: object.description,
            fields: object.fields
        })
    }

    buildSchema(){
        return new GraphQLSchema({
            query: new GraphQLObjectType({
                name : 'Query',
                fields: this.Query
            }),
            mutation: new GraphQLObjectType({
                name: 'Mutation',
                fields: this.Mutation
            })
        })
    }
}
