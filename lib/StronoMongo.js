const StronoComposer = require('./StronoComposer')
const mongoose = require('mongoose')
const { GraphQLScalarType, GraphQLNonNull, GraphQLList, GraphQLInputObjectType, GraphQLObjectType, GraphQLError } = require('graphql')
const pluralize = require('pluralize')
const {camelCase, isObject, capitalize} = require('./utils')



module.exports = class StronoMongo extends StronoComposer{

    mongooseTypes = {
        'String' : String,
        'Int' : Number,
        'Float' : Number,
        'Datetime' : Date,
    }
    models = {}

    constructor(schemas, ) {
        super(schemas)
        this.createMongooseModels()
        this.createMongooseTypes()
        this.createTypes()
        this.generateCompositionQueries()
    }

    objectId () {
        let hex =  (value) => Math.floor(value).toString(16)

        return hex(Date.now() / 1000) +
            ' '.repeat(16).replace(/./g, () => hex(Math.random() * 16))
    }


    createMongooseTypes(){
        this.types['MongoID'] = new GraphQLScalarType({
            name: 'MongoID',
            serialize: (value) =>{
                // if(!isObject(value)) return null
                return value
            },
            parseValue: (value) =>{
                return value
                // if (/^[0-9a-fA-F]{24}$/.test(value)){
                //     return value
                // }else{
                //     return new GraphQLError(`ID ${value} is not valid`)
                // }
            }
        })
    }
    createMongooseModels() {
        this.compositions.forEach(composition =>{
            if (!composition.name) throw { error: 'Schema name missing' }
            let model = {
                _id: mongoose.Schema.Types.ObjectId
            }
            composition.fields.forEach(field=>{

                let type = {
                    type: this.mongooseTypes[field.type],
                    required: field.required,
                    unique: field.unique,
                    default: field.default
                }

                if(field.ref)
                    type = { type: mongoose.Schema.Types.ObjectId, ref: field.type }

                type = field.many ? [type] : type
                model[field.name] = type
            })
            this.models[composition.name] = mongoose.model(composition.name, new mongoose.Schema(model))
        })
    }

    createTypes(){
        // console.log(this.compositions[0])
        this.compositions.forEach(composition=>{
            let CompositionType = this.createOutputType(composition)
            let CompositionInput = this.createInputType(composition)
            let CompositionWhereInput = this.createWhereInputType(composition)
            let CompositionWhereUniqueInput = this.createWhereUniqueInputType(composition)

            this.addType(composition.name, CompositionType)
            this.addInputType(`${composition.name}Input`, CompositionInput)
            this.addInputType(`${composition.name}WhereInput`, CompositionWhereInput)
            this.addInputType(`${composition.name}WhereUniqueInput`, CompositionWhereUniqueInput)
        })
    }

    createOutputType(composition){
        return this.createObjectType({
            name: composition.name,
            description: `${composition.name} Type`,
            fields: ()=>{
                let fields = {
                    _id: { type: this.getType('MongoID') }
                }
                composition.fields.forEach(field => {
                    let type = this.getType(field.type)
                    if(field.many){
                        type = new GraphQLList(type)
                    }

                    if(!field.ref){
                        fields[field.name] = { type }
                    }else {
                        let resolve
                        if(!field.many){
                            resolve = async (parent, args) =>{
                                // console.log({parent, args})
                                return this.models[field.type].findById(parent[field.name])
                                    .then(res=>{
                                        // console.log({res})
                                        return res
                                    })
                            }
                        }else{
                            resolve = async (parent, args) => {
                                let query = parent[field.name] || []
                                let res = await this.models[field.type].find({
                                    _id: {
                                        $in: query.map(id=>mongoose.Types.ObjectId(id))
                                    }
                                })
                                return res
                            }
                        }
                        fields[field.name] = { type, resolve }
                    }
                })
                return fields
            }
        })
    }

    createInputType(composition,){
        return this.createObjectInputType({
            name: `${composition.name}Input`,
            description: `${composition.name}Input Type`,
            fields: ()=>{
                let fields = {}
                composition.fields.forEach(field =>{
                    let type = this.getInputType(`${field.type}Input`)
                    if(!type)
                        type = this.getType(field.type)

                    // Create Links create, connect, and disconnect
                    if(field.ref){
                        type = new GraphQLInputObjectType({
                            name: `${composition.name}${capitalize(field.name)}Input`,
                            fields: {
                                create: {
                                    name: `${composition.name}${capitalize(field.name)}CreateInput`,
                                    type: field.many ?
                                        new GraphQLList(this.getInputType(`${field.type}Input`)) :
                                        this.getInputType(`${field.type}Input`)

                                },
                                connect: {
                                    name: `${composition.name}${capitalize(field.name)}ConnectInput`,
                                    type: field.many ?
                                        new GraphQLList(this.getType(`MongoID`)) :
                                        this.getType(`MongoID`)

                                }
                            },
                        })
                    }

                    if(field.required)
                        type = new GraphQLNonNull(type)


                    fields[field.name] = field.ref ? {
                        type,
                        // resolve: (parent, args)=>{
                        //     console.log('hello', parent, args)
                        //     return []
                        // }
                    } :
                    { type }
                })

                return fields
            }
        })
    }

    createWhereInputType(composition){
        return this.createObjectInputType({
            name: `${composition.name}WhereInput`,
            description: `${composition.name}WhereInput Type`,
            fields: ()=>{
                let fields = {}
                composition.fields.forEach(field =>{
                    let type = this.getInputType(`${field.type}WhereInput`)
                    if(!type)
                        type = this.getType(field.type)

                    fields[field.name] = { type }
                })

                return fields
            }
        })
    }

    createWhereUniqueInputType(composition){
        return this.createObjectInputType({
            name: `${composition.name}WhereUniqueInputType`,
            description: `${composition.name}WhereUniqueInputType Type`,
            fields: ()=>{
                let fields = {
                    _id: { type:  this.getType('MongoID') }
                }
                composition.fields.forEach(field =>{
                    if(field.unique) {
                        let type = this.getType(field.type)
                        fields[field.name] = { type }
                    }
                })

                return fields
            }
        })
    }

    generateCompositionQueries(){
        // console.log(JSON.stringify(this.compositions[0], null, 2))
        this.compositions.forEach(composition=>{
                this.createQueries(composition)
                this.createMutations(composition)
        })
    }

    createQueries(composition){
        this.compositions.forEach(composition=>{

            // FindMany
            this.Query[camelCase(pluralize(composition.name))] = {
                type : new GraphQLList(this.getType(composition.name)),
                args: { where: { type: this.getInputType(`${composition.name}WhereInput`) }},
                resolve: (parent, args)=>{
                    return this.models[composition.name].find(args.where)
                }
            }

            // FindByUnique
            this.Query[camelCase(composition.name)] = {
                type : this.getType(composition.name),
                args: { where: { type: new GraphQLNonNull(this.getInputType(`${composition.name}WhereUniqueInput`)) } },
                resolve: (parent, args)=>{
                    return this.models[composition.name].findOne(args.where)
                }
            }

        })
    }

    applyAssociation(composition_name, ref_type, callback){
        for (let associate of this.references[ref_type]) {
            if (associate.type === composition_name) {
                return callback(associate)
            }
        }
    }

    createMutations(composition){
        this.compositions.forEach(composition=>{
            // Create
            this.Mutation[`create${composition.name}`] = this.createOne(composition)

        })
        // CreateMany
        // UpdateByUnique
        // UpdateMany
        // DeleteByUnique
        // DeleteMany
    }

    createOne(composition){
        return {
            type: this.getType(composition.name),
            args: { data: { type: new GraphQLNonNull(this.getInputType(`${composition.name}Input`)) } },
            resolve: async (parent, args)=>{
                args.data._id = this.objectId()
                let data = {...args.data}
                let compositionRefs = this.references[composition.name]
                for (let compositionRef of compositionRefs){
                    if(data[compositionRef.name]){
                        let createData = data[compositionRef.name].create
                        let connectData = data[compositionRef.name].connect
                        if(compositionRef.many){

                            args.data[compositionRef.name] = []

                            if(createData){
                                for (let item of createData){
                                    await this.applyAssociation(composition.name, compositionRef.type, async association=>{
                                        // console.log({ association, item, compositionRef, composition})
                                        let itemModel = new this.models[compositionRef.type]({
                                            _id: this.objectId(),
                                            ...item,
                                        })

                                        // Assign the association if the field accepts arrays or not
                                        if (association.many)
                                            itemModel[association.name].push(data._id)
                                        else
                                            itemModel[association.name] = data._id

                                        let res = await itemModel.save()
                                        if(res)
                                            args.data[compositionRef.name].push(res._id)
                                    })
                                }
                            }
                            // console.log(JSON.stringify(args.data, null, 2))

                            if(connectData){
                                //Sets associated collection that has been referenced the data id
                                for (let connect_id of connectData){
                                    await this.applyAssociation(composition.name, compositionRef.type, async association=>{
                                        let foundConnection = await this.models[compositionRef.type].findOne({ _id: connect_id })
                                        if (foundConnection){
                                            if(association.many){
                                                foundConnection[association.name].addToSet(data._id)
                                            }else{
                                                foundConnection[association.name] = data._id
                                            }
                                            let res = await foundConnection.save()
                                            if(res)
                                                args.data[compositionRef.name].push(res._id)
                                        }
                                        // let associationData = { [association.name]: data._id }
                                        // let res = await this.models[compositionRef.type].findOneAndUpdate(associationFilter, associationData)
                                        // console.log({res, association, compositionRef, composition})

                                    })
                                }
                            }
                        } else {
                            if(createData){
                                await this.applyAssociation(composition.name, compositionRef.type, async association=>{
                                    // console.log({ association, item, compositionRef, composition})
                                    let itemModel = new this.models[compositionRef.type]({
                                        _id: this.objectId(),
                                        ...createData,
                                        [association.name]: data._id
                                    })
                                    let res = await itemModel.save()
                                    if(res)
                                        args.data[compositionRef.name] = res._id
                                })
                            }
                            // console.log(JSON.stringify(args.data, null, 2))

                            if(connectData){
                                //Sets associated collection that has been referenced the data id
                                    await this.applyAssociation(composition.name, compositionRef.type, async association=>{
                                        let associationData = { [association.name]: data._id }
                                        let associationFilter = { _id: connectData }
                                        let res = await this.models[compositionRef.type].findOneAndUpdate(associationFilter, associationData)
                                        // console.log({res, association, compositionRef, composition})
                                        if(res)
                                            args.data[compositionRef.name] = res._id

                                })
                            }
                        }
                    }
                    // create data
                    // connect data
                }
                let dataModel = new this.models[composition.name](args.data)
                return dataModel.save()
            }
        }
    }
}